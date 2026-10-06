import {cn} from "@/lib/utils/classnames";
import {Filter, Grid2X2, List} from "lucide-react";
import {ChangeEventHandler, ReactNode} from "react";
import {Button} from "@/lib/client/components/ui/button";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {ToggleGroup, ToggleGroupItem} from "@/lib/client/components/ui/toggle-group";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


interface MediaBrowseToolbarProps {
    search: string;
    isGrid: boolean;
    actions?: ReactNode;
    searchLabel?: string;
    onGridClick: () => void;
    searchPlaceholder?: string;
    onFiltersClick?: () => void;
    onSearchChange: ChangeEventHandler<HTMLInputElement>;
    selects?: {
        key: string;
        label: string;
        value: string;
        onChange: (value: string) => void;
        items: { value: string; label: ReactNode }[];
    }[];
}


export const MediaBrowseToolbar = (props: MediaBrowseToolbarProps) => {
    const {
        search,
        isGrid,
        actions,
        onGridClick,
        selects = [],
        onFiltersClick,
        onSearchChange,
        searchLabel = "Search media",
        searchPlaceholder = "Search titles...",
    } = props;

    return (
        <div className="flex min-w-0 flex-col gap-3" role="group" aria-label="Media browsing controls">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
                <SearchInput
                    value={search}
                    aria-label={searchLabel}
                    onChange={onSearchChange}
                    placeholder={searchPlaceholder}
                    className="min-w-48 flex-1 max-lg:basis-full"
                />
                <div className="grid w-full min-w-0 grid-cols-2 items-center gap-3 sm:flex sm:w-auto sm:flex-wrap">
                    {selects.map((control, idx) =>
                        <Select
                            key={control.key}
                            items={control.items}
                            value={control.value}
                            onValueChange={val => val !== null && control.onChange(val)}
                        >
                            <SelectTrigger
                                aria-label={control.label}
                                className={cn("w-full min-w-0 sm:w-42",
                                    selects.length % 2 === 1 && idx === selects.length - 1 && "max-sm:col-span-2"
                                )}
                            >
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {control.items.map(item =>
                                        <SelectItem key={item.value} value={item.value}>
                                            {item.label}
                                        </SelectItem>
                                    )}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    )}
                    <div className="flex items-center justify-between gap-3 max-sm:col-span-2">
                        {onFiltersClick &&
                            <Button variant="outline" onClick={onFiltersClick} title="Advanced filters">
                                <Filter data-icon="inline-start"/>{" "}
                                Filters
                            </Button>
                        }

                        <ViewModeToggle
                            isGrid={isGrid}
                            onGridClick={onGridClick}
                        />
                    </div>
                </div>
            </div>

            {actions &&
                <div className="flex flex-wrap items-center gap-3">
                    {actions}
                </div>
            }
        </div>
    );
};


interface ViewModeToggleProps {
    isGrid: boolean;
    onGridClick: () => void;
}


const ViewModeToggle = ({ isGrid, onGridClick }: ViewModeToggleProps) => {
    return (
        <ToggleGroup
            spacing={0}
            variant="brand"
            value={[isGrid ? "grid" : "table"]}
            aria-label="Media list display mode"
            onValueChange={values => {
                if (values[0] && (values[0] === "grid") !== isGrid) onGridClick();
            }}
        >
            <ToggleGroupItem value="grid" aria-label="Grid view" title="Grid view">
                <Grid2X2/>
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Table view" title="Table view">
                <List/>
            </ToggleGroupItem>
        </ToggleGroup>
    );
};
