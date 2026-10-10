import z from "zod";
import {useSuspenseQuery} from "@tanstack/react-query";
import {createFileRoute} from "@tanstack/react-router";
import {dynamicListSearchSchema} from "@/lib/schemas/dynamic-lists.schema";
import {DynamicListEditor} from "@/lib/client/components/dynamic-lists/DynamicListEditor";
import {dynamicListEditorOptions} from "@/lib/client/react-query/query-options/dynamic-lists.options";


export const Route = createFileRoute("/_main/_private/lists/dynamic/$listId/edit")({
    params: {
        parse: params => {
            const result = z.strictObject({ listId: z.coerce.number().int().positive() }).safeParse(params);
            return result.success ? result.data : false;
        },
    },
    validateSearch: dynamicListSearchSchema,
    loader: ({ params: { listId }, context: { queryClient } }) => queryClient.fetchQuery({ ...dynamicListEditorOptions(listId), staleTime: 0 }),
    component: DynamicListEditPage,
});


function DynamicListEditPage() {
    const navigate = Route.useNavigate();
    const { listId } = Route.useParams();
    const search = Route.useSearch();
    const view = useSuspenseQuery(dynamicListEditorOptions(listId)).data;

    return <DynamicListEditor
        key={listId}
        listId={listId}
        initialSpec={view.spec}
        onCancel={() => void navigate({ to: "/lists/dynamic/$listId", params: { listId }, search })}
        onSaved={savedId => void navigate({ to: "/lists/dynamic/$listId", params: { listId: savedId }, search: { page: 1 } })}
    />;
}
