import z from "zod";
import {createFileRoute} from "@tanstack/react-router";
import {SMART_VIEW_PRESETS} from "@/lib/utils/smart-views/presets";
import type {SmartViewSpec} from "@/lib/schemas/smart-views.schema";
import {SmartListEditor} from "@/lib/client/components/smart-views/SmartListEditor";


export const Route = createFileRoute("/_main/_private/smart-views/create")({
    validateSearch: z.object({ preset: z.number().int().min(0).max(SMART_VIEW_PRESETS.length - 1).optional().catch(undefined) }),
    component: SmartListCreatePage,
});


function SmartListCreatePage() {
    const navigate = Route.useNavigate();
    const { preset } = Route.useSearch();
    const initialSpec: SmartViewSpec = preset === undefined ? {
        version: 1,
        filters: {},
        display: "grid",
        mediaTypes: "all",
        title: "My smart list",
        sort: { field: "addedAt", direction: "desc" },
    } : SMART_VIEW_PRESETS[preset];

    return <SmartListEditor
        key={preset ?? "blank"}
        initialSpec={initialSpec}
        onCancel={() => void navigate({ to: "/smart-views" })}
        onSaved={viewId => void navigate({ to: "/smart-views/$viewId", params: { viewId }, search: { page: 1 } })}
    />;
}
