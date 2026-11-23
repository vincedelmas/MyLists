import z from "zod";
import dedent from "dedent";
import {clientEnv} from "@/env/client";
import {RoleType} from "@/lib/utils/enums";
import type {ToolContext} from "@/lib/server/core/mcp/tool-context";
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {AdminRepository} from "@/lib/server/domain/admin/admin.repository";
import {MCP_READ_SCOPE, MCP_WRITE_SCOPE} from "@/lib/server/core/mcp/config";
import {
    adminBooksForGroupingInputSchema,
    adminListBookMergeSuggestionsInputSchema,
    adminMarkBooksReviewedInputSchema,
    adminProposeBookMergesInputSchema,
} from "@/lib/schemas/tool-schemas";


export const registerAdminBookMergeTools = (context: ToolContext, server: McpServer) => {
    if (context.role !== RoleType.ADMIN) return;

    const { register, scopes } = context;

    register("admin_get_books_for_grouping", {
        inputSchema: adminBooksForGroupingInputSchema,
        description: [
            "Admin only. Fetch catalog books to find duplicate editions of the same literary Work.",
            "mode=authors (default) returns multi-book authors with unreviewed books (or one author via author=name). When includeReviewed=false, keep requesting page=1 after marking each batch reviewed because reviewed authors leave the queue. If an author has truncated=true, page through their full catalog with mode=authors, author=<name> before marking their books reviewed.",
            "mode=unreviewed returns unreviewed books in book ID order using a stable keyset cursor (pass nextCursor as cursor, or omit cursor after marking books reviewed).",
            "mode=search searches the full catalog by title, author, publisher, or #id.",
            "Includes review progress and existing pending/dismissed suggestions touching the returned books.",
        ].join(" "),
    }, (data) => AdminRepository.getBooksForLlmGrouping(data));

    register("admin_propose_book_merges", {
        write: true,
        inputSchema: adminProposeBookMergesInputSchema,
        annotations: { idempotentHint: false, destructiveHint: false },
        description: [
            "Admin only. Stage proposed book-to-Work merges for review in the admin UI; never merges or deletes books directly.",
            "Automatically skips exact groups already pending or dismissed, and marks accepted books (plus markReviewedBookIds) as reviewed.",
        ].join(" "),
    }, (data) => {
        const result = AdminRepository.proposeBookMerges(data);
        return {
            ...result,
            reviewUrl: new URL("/admin/book-merges?view=suggestions", clientEnv.VITE_BASE_URL).href,
        };
    });

    register("admin_mark_books_reviewed", {
        write: true,
        inputSchema: adminMarkBooksReviewedInputSchema,
        annotations: { idempotentHint: true, destructiveHint: false },
        description: "Admin only. Mark inspected book IDs as reviewed (when no merges are needed), or pass reset=true to clear review markers.",
    }, (data) => AdminRepository.markBooksReviewed(data));

    register("admin_list_book_merge_suggestions", {
        inputSchema: adminListBookMergeSuggestionsInputSchema,
        description: "Admin only. List pending or dismissed book merge suggestions.",
    }, (data) => AdminRepository.listBookMergeSuggestions(data));

    if (scopes.has(MCP_READ_SCOPE) && scopes.has(MCP_WRITE_SCOPE)) {
        server.registerPrompt("group_books_into_works", {
            title: "Group books into Works",
            description: "Inspect unreviewed MyLists catalog books and stage duplicate edition merge suggestions for admin review.",
            argsSchema: {
                focus: z.string().trim().max(200).optional().describe("Optional focus: 'authors', 'unreviewed', or an author/title to inspect."),
            },
        }, ({ focus }) => ({
            messages: [{
                role: "user",
                content: {
                    type: "text",
                    text: dedent`
                        Inspect MyLists catalog books and stage merge suggestions that group duplicate editions into one canonical Work.
                        ${focus ? `Focus: ${focus}` : "Start with mode='authors' to inspect multi-book authors with unreviewed books."}

                        Rules for grouping books into Works:
                        - MERGE editions of the same literary Work: translations into other languages, paperback/hardcover/illustrated/anniversary/revised editions, subtitle variations, and minor title or author spelling differences.
                        - DO NOT MERGE different books in a series (e.g. Vol 1 vs Vol 2, Dune vs Dune Messiah), box sets or omnibuses with individual volumes, companions/study guides/summaries, or adaptations (e.g. graphic novel vs prose novel).
                        - Skip any book group that is already in existingSuggestions (pending or dismissed).
                        - Pick targetBookId as the cleanest canonical Work title (prefer the original or English edition without edition clutter, breaking ties by highest usersCount).
                        - Use confidence: "high" for unmistakable same-work editions, "medium" for likely matches with slight ambiguity, "low" for uncertain candidates worth checking.
                        - Keep each reason concise (1 sentence explaining why they are the same Work).
                        - If an author has truncated=true, do not mark their books reviewed from the truncated batch alone; page through their full catalog with admin_get_books_for_grouping(mode="authors", author="<name>", page=1..pages, limit=100) before marking them reviewed so duplicates across batches are not missed.
                        - If you spot a possible author spelling variant, cross-check with admin_get_books_for_grouping(mode="search").
                        - Submit proposals with admin_propose_book_merges and pass all inspected book IDs in markReviewedBookIds (or call admin_mark_books_reviewed if a batch has no duplicates).
                        - When advancing to the next batch with includeReviewed=false: keep fetching page=1 in mode="authors" (reviewed authors leave the queue), and pass nextCursor as cursor (or omit cursor) in mode="unreviewed".
                        - Finish with a short summary of batches reviewed, suggestions created, and the review URL.
                    `,
                },
            }],
        }));
    }
};
