import z from "zod";
import {useSuspenseQuery} from "@tanstack/react-query";
import {createFileRoute} from "@tanstack/react-router";
import {smartViewSearchSchema} from "@/lib/schemas/smart-views.schema";
import {SmartListEditor} from "@/lib/client/components/smart-views/SmartListEditor";
import {smartViewEditorOptions} from "@/lib/client/react-query/query-options/smart-views.options";


export const Route = createFileRoute("/_main/_private/smart-views/$viewId/edit")({
    params: {
        parse: params => {
            const result = z.strictObject({ viewId: z.coerce.number().int().positive() }).safeParse(params);
            return result.success ? result.data : false;
        },
    },
    validateSearch: smartViewSearchSchema,
    loader: ({ params: { viewId }, context: { queryClient } }) => queryClient.fetchQuery({ ...smartViewEditorOptions(viewId), staleTime: 0 }),
    component: SmartListEditPage,
});


function SmartListEditPage() {
    const navigate = Route.useNavigate();
    const { viewId } = Route.useParams();
    const search = Route.useSearch();
    const view = useSuspenseQuery(smartViewEditorOptions(viewId)).data;

    return <SmartListEditor
        key={viewId}
        viewId={viewId}
        initialSpec={view.spec}
        onCancel={() => void navigate({ to: "/smart-views/$viewId", params: { viewId }, search })}
        onSaved={savedId => void navigate({ to: "/smart-views/$viewId", params: { viewId: savedId }, search: { page: 1 } })}
    />;
}
