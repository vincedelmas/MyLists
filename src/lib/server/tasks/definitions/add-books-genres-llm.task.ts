import {z} from "zod";
import dedent from "dedent";
import {serverEnv} from "@/env/server";
import {adminLlmResponseSchema} from "@/lib/schemas";
import {getContainer} from "@/lib/server/core/container";
import {defineTask} from "@/lib/server/tasks/define-task";


export const addGenresToBooksUsingLlmTask = defineTask({
    name: "add-books-genres-llm" as const,
    visibility: "admin",
    description: "Use LLM to assign genres to books without genres",
    inputSchema: z.object({
        batchSize: z.coerce.number().min(1).max(10).default(10).optional().describe("Number of books per batch"),
        batchLimit: z.coerce.number().min(1).max(50).default(10).optional().describe("Maximum number of batches to process"),
    }),
    handler: async (ctx, input) => {
        const container = await getContainer();
        const llmClient = container.apiClients.llmClient;
        const bookCatalog = container.media.catalog.maintenance.books;

        ctx.metric("llm.model", serverEnv.LLM_MODEL_ID);
        ctx.metric("llm.endpoint", serverEnv.LLM_BASE_URL);

        const booksGenres = BOOK_GENRES;
        const booksWithoutGenres = await bookCatalog.getBooksWithoutGenres();
        const prompts = booksWithoutGenres.map((book) => `
bookApiId: ${book.apiId}
title: ${book.title}
authors: ${book.authors}
description: ${book.synopsis}
----------
`);
        const batchSize = input.batchSize ?? 10;
        const batchedBooks = Array.from(
            { length: Math.ceil(prompts.length / batchSize) },
            (_, index) => prompts.slice(index * batchSize, (index + 1) * batchSize),
        );
        const processingBatches = batchedBooks.slice(0, input.batchLimit ?? 10);

        ctx.metric("batches.total", batchedBooks.length);
        ctx.metric("batches.toProcess", processingBatches.length);

        const mainPrompt = dedent`
            You are given a list of books. Your task is to assign up to 4 relevant genres to each book from the 
            provided genre list. Genres to choose from:
            ${booksGenres.join(", ")}
            
            Instructions:
            1. Choose a MAXIMUM of 4 genres per book.
            2. ONLY choose genres from the above list.
            3. Output your answer as a JSON array following this schema:
               [
                 {
                   "bookApiId": string,
                   "genres": string[]
                 }
               ]
            
            Make sure your response is **valid JSON** and strictly follows the schema.
        `;

        let batchIndex = 0;
        for (const booksBatch of processingBatches) {
            batchIndex += 1;

            await ctx.step(`batch-${batchIndex}`, async () => {
                const promptToSend = `${mainPrompt}\n${booksBatch.join("\n")}`;

                const data = await llmClient.llmBookGenresCall(promptToSend, adminLlmResponseSchema);
                const content = data.choices[0].message.content ?? "";

                let result;
                try {
                    result = adminLlmResponseSchema.parse(JSON.parse(content));
                }
                catch (parseErr) {
                    ctx.error("Failed to parse LLM JSON response", { content });
                    throw parseErr;
                }

                for (const item of result) {
                    const validGenres = item.genres.filter((g) => booksGenres.includes(g)).slice(0, 4);

                    if (!item.bookApiId || validGenres.length === 0) {
                        ctx.warn("Skipping invalid LLM entry", { item });
                        ctx.increment("books.skipped");
                        continue;
                    }

                    await bookCatalog.synchronizeGenresByExternalId(item.bookApiId, validGenres);
                    ctx.increment("books.tagged");
                }
            });
        }
    },
});


const BOOK_GENRES: readonly string[] = [
    "Action & Adventure", "Biography", "Chick lit", "Children", "Classic", "Crime", "Drama",
    "Dystopian", "Essay", "Fantastic", "Fantasy", "Historical Fiction", "History", "Humor", "Horror",
    "Literary Novel", "Memoirs", "Mystery", "Paranormal", "Philosophy", "Poetry", "Romance", "Science",
    "Science-Fiction", "Short story", "Suspense", "Testimony", "Thriller", "Western", "Young adult",
];
