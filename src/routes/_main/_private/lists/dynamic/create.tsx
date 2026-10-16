import z from "zod";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {createFileRoute} from "@tanstack/react-router";
import {DYNAMIC_LIST_PRESETS} from "@/lib/utils/dynamic-lists/presets";
import type {DynamicListSpec} from "@/lib/schemas/dynamic-lists.schema";
import {DynamicListEditor} from "@/lib/client/components/dynamic-lists/DynamicListEditor";
import {DYNAMIC_LIST_PRESET_ICONS} from "@/lib/client/components/dynamic-lists/dynamic-list.config";
import {DynamicListEditorSelect} from "@/lib/client/components/dynamic-lists/DynamicListEditorFields";


export const Route = createFileRoute("/_main/_private/lists/dynamic/create")({
    validateSearch: z.object({
        preset: z.number().int().min(0).max(DYNAMIC_LIST_PRESETS.length - 1).optional().catch(undefined),
    }),
    component: DynamicListCreatePage,
    head: () => ({ meta: [{ title: "Create a dynamic list - MyLists" }] }),
});


const startingPoints = [
    { value: "blank", label: "Blank list" },
    ...DYNAMIC_LIST_PRESETS.map((spec, index) => {
        const Icon = DYNAMIC_LIST_PRESET_ICONS[spec.title];
        return { value: String(index), label: <><Icon/>{spec.title}</> };
    }),
];


function DynamicListCreatePage() {
    const { currentUser } = useAuth();
    const navigate = Route.useNavigate();
    const { preset } = Route.useSearch();

    const initialSpec: DynamicListSpec = preset === undefined
        ? {
            version: 2,
            filters: {},
            display: "grid",
            mediaTypes: "all",
            title: "My list",
            sort: { field: "addedAt", direction: "desc" },
        }
        : DYNAMIC_LIST_PRESETS[preset];

    return <DynamicListEditor
        key={preset ?? "blank"}
        initialSpec={initialSpec}
        onSaved={listId => void navigate({ to: "/lists/dynamic/$listId", params: { listId }, search: { page: 1 } })}
        onCancel={() => void navigate({ to: "/lists/$username", params: { username: currentUser!.name } })}
        startingPoint={(disabled, id) =>
            <DynamicListEditorSelect
                id={id}
                disabled={disabled}
                className="sm:max-w-md"
                options={startingPoints}
                aria-label="List starting point"
                value={preset === undefined ? "blank" : String(preset)}
                onChange={value => void navigate({ search: { preset: value === "blank" ? undefined : Number(value) }, replace: true })}
            />
        }
    />;
}
