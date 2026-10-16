import {useState, type ReactNode} from "react";
import {SlidersHorizontal} from "lucide-react";
import type {MediaType} from "@/lib/utils/enums";
import {capitalize} from "@/lib/utils/formatting/text";
import type {ScopedMediaFilters} from "@/lib/schemas/media-filters.schema";
import {ToggleGroup, ToggleGroupItem} from "@/lib/client/components/ui/toggle-group";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {FieldGroup} from "@/lib/client/components/ui/field";


interface MediaTypeFilterTabsProps {
    mediaTypes: readonly MediaType[];
    filters: ScopedMediaFilters;
    common?: ReactNode;
    commonCount?: number;
    children: (mediaType: MediaType) => ReactNode;
}


export const MediaTypeFilterTabs = ({ mediaTypes, filters, common, commonCount = 0, children }: MediaTypeFilterTabsProps) => {
    const [selected, setSelected] = useState<"common" | MediaType>(common ? "common" : mediaTypes[0]);
    const active = (selected === "common" && !!common) || mediaTypes.includes(selected as MediaType)
        ? selected : common ? "common" : mediaTypes[0];
    if (mediaTypes.length < 2) return <FieldGroup>{common}{mediaTypes.map(type => <div key={type}>{children(type)}</div>)}</FieldGroup>;

    return (
        <FieldGroup>
            <ToggleGroup
                variant="brand"
                className="grid w-full grid-cols-2 gap-2"
                aria-label="Filter groups"
                value={[active]}
                onValueChange={values => values[0] && setSelected(values[0] as "common" | MediaType)}
            >
                {common &&
                    <ToggleGroupItem value="common" aria-label="Common filters" className="min-w-0 justify-start">
                        <SlidersHorizontal className="size-4 shrink-0"/>
                        <span className="truncate">Common</span>
                        {commonCount > 0 && <span className="ml-auto text-xs tabular-nums">{commonCount}</span>}
                    </ToggleGroupItem>
                }
                {mediaTypes.map(mediaType => {
                    const label = mediaType === "series" ? "TV series" : capitalize(mediaType);
                    const count = Object.entries(filters[mediaType] ?? {}).reduce((sum, [key, value]) => sum + (key !== "tagsMatch" && Array.isArray(value) ? value.length : 0), 0);
                    return <ToggleGroupItem key={mediaType} value={mediaType} aria-label={`${label} filters`} className="min-w-0 justify-start">
                        <MainThemeIcon type={mediaType}/>
                        <span className="truncate">{label}</span>
                        {count > 0 && <span className="ml-auto text-xs tabular-nums">{count}</span>}
                    </ToggleGroupItem>;
                })}
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">Common rules apply to every type. Rules in a media tab apply only to that type.</p>
            {active === "common" ? common : children(active)}
        </FieldGroup>
    );
};
