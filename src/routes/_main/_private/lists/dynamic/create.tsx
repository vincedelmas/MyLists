import z from "zod";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {createFileRoute} from "@tanstack/react-router";
import {DYNAMIC_LIST_PRESETS} from "@/lib/utils/dynamic-lists/presets";
import type {DynamicListSpec} from "@/lib/schemas/dynamic-lists.schema";
import {DynamicListEditor} from "@/lib/client/components/dynamic-lists/DynamicListEditor";
import {DYNAMIC_LIST_PRESET_ICONS} from "@/lib/client/components/dynamic-lists/dynamic-list.config";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


export const Route = createFileRoute("/_main/_private/lists/dynamic/create")({
    validateSearch: z.object({ preset: z.number().int().min(0).max(DYNAMIC_LIST_PRESETS.length - 1).optional().catch(undefined) }),
    component: DynamicListCreatePage,
});


const startingPoints = [
    { value: "blank", label: "Blank list" },
    ...DYNAMIC_LIST_PRESETS.map((spec, index) => {
        const Icon = DYNAMIC_LIST_PRESET_ICONS[spec.title];
        return { value: String(index), label: <><Icon/>{spec.title}</> };
    }),
];


function DynamicListCreatePage() {
    const navigate = Route.useNavigate();
    const { currentUser } = useAuth();
    const { preset } = Route.useSearch();
    const initialSpec: DynamicListSpec = preset === undefined ? {
        version: 1,
        filters: {},
        display: "grid",
        mediaTypes: "all",
        title: "My list",
        sort: { field: "addedAt", direction: "desc" },
    } : DYNAMIC_LIST_PRESETS[preset];

    return <DynamicListEditor
        key={preset ?? "blank"}
        initialSpec={initialSpec}
        startingPoint={(disabled, id) =>
            <Select disabled={disabled} items={startingPoints} value={preset === undefined ? "blank" : String(preset)} onValueChange={value => {
                if (value !== null) void navigate({ search: { preset: value === "blank" ? undefined : Number(value) }, replace: true });
            }}>
                <SelectTrigger id={id} aria-label="List starting point" className="w-full sm:max-w-md"><SelectValue/></SelectTrigger>
                <SelectContent><SelectGroup>
                    {startingPoints.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectGroup></SelectContent>
            </Select>
        }
        onCancel={() => void navigate({ to: "/lists/$username", params: { username: currentUser!.name } })}
        onSaved={listId => void navigate({ to: "/lists/dynamic/$listId", params: { listId }, search: { page: 1 } })}
    />;
}
