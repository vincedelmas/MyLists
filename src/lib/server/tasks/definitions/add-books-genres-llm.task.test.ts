import Database from "bun:sqlite";
import {eq} from "drizzle-orm";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {expect, it, vi} from "vitest";
import {books, booksGenre} from "@/lib/server/database/schema";
import {createTaskContext} from "@/lib/server/tasks/task-context";
import {createBooksService} from "@/lib/server/domain/media/books/books.service";
import {createBooksRepository} from "@/lib/server/domain/media/books/books.repository";
import {addGenresToBooksUsingLlmTask} from "./add-books-genres-llm.task";


const { dbContext, llmBookGenresCall } = vi.hoisted(() => ({
    dbContext: {} as { db: ReturnType<typeof drizzle> },
    llmBookGenresCall: vi.fn(),
}));

vi.mock("@/env/server", () => ({
    serverEnv: { LLM_API_KEY: "test", LLM_MODEL_ID: "test", LLM_BASE_URL: "https://example.invalid" },
}));
vi.mock("@/lib/server/database/db", () => ({ get db() { return dbContext.db; } }));
vi.mock("@/lib/server/core/logger", () => ({ logger: { child: vi.fn() } }));
vi.mock("@/lib/server/core/container", () => ({
    getContainer: async () => ({
        apiClients: { llmClient: { llmBookGenresCall } },
        registries: { mediaService: { get: () => createBooksService(createBooksRepository()) } },
    }),
}));


it("skips out-of-batch IDs and books removed while awaiting genres", async () => {
    const sqlite = new Database(":memory:");
    try {
        const db = dbContext.db = drizzle({ client: sqlite });
        migrate(db, { migrationsFolder: "./drizzle" });
        db.insert(books).values([
            { id: 1, apiId: "source", name: "Source edition", pages: 100, imageCover: "default.jpg" },
            { id: 2, apiId: "target", name: "Target work", pages: 100, imageCover: "default.jpg" },
            { id: 3, apiId: "tagged", name: "Already tagged", pages: 100, imageCover: "default.jpg" },
        ]).run();
        db.insert(booksGenre).values({ mediaId: 3, name: "History" }).run();

        llmBookGenresCall.mockImplementationOnce(async (prompt: string) => {
            expect(prompt).toContain("bookApiId: source");
            expect(prompt).toContain("bookApiId: target");
            expect(prompt).not.toContain("bookApiId: tagged");
            db.delete(books).where(eq(books.id, 1)).run();
            const content = JSON.stringify(["tagged", "source", "target"]
                .map((bookApiId) => ({ bookApiId, genres: ["Fantasy"] })));
            return { choices: [{ message: { content } }] };
        });

        const { ctx, finalize } = createTaskContext({
            taskId: "test", taskName: addGenresToBooksUsingLlmTask.name, triggeredBy: "cron/cli",
        });
        await addGenresToBooksUsingLlmTask.handler(ctx, {});

        expect(finalize("completed")).toMatchObject({
            status: "completed",
            metrics: { "books.skipped": 2, "books.tagged": 1 },
        });
        expect(db.select({ mediaId: booksGenre.mediaId, name: booksGenre.name }).from(booksGenre).orderBy(booksGenre.mediaId).all())
            .toEqual([{ mediaId: 2, name: "Fantasy" }, { mediaId: 3, name: "History" }]);
    }
    finally {
        sqlite.close();
    }
});
