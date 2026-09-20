import * as z from "zod";
import {createFileRoute, notFound} from "@tanstack/react-router";
import {authOptions} from "@/lib/client/react-query/query-options";
import {BookWorkManager} from "@/lib/client/components/media/books/BookWorkManager";

export const Route = createFileRoute("/_main/_private/books/manage")({
    validateSearch: z.object({ workId: z.coerce.number().int().positive().optional().catch(undefined) }),
    beforeLoad: ({ context: { queryClient } }) => {
        if (!queryClient.getQueryData(authOptions.queryKey)?.capabilities.editCatalog) throw notFound();
    },
    head: () => ({ meta: [{ title: "Books & editions | MyLists" }, { name: "robots", content: "noindex, nofollow" }] }),
    component: ManageBooksPage,
});

function ManageBooksPage() {
    const { workId } = Route.useSearch();
    return <BookWorkManager initialWorkId={workId}/>;
}
