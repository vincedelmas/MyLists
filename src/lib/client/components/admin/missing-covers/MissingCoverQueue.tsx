import {capitalize} from "@/lib/utils/formatting/text";
import {Button} from "@/lib/client/components/ui/button";
import type {AdminMissingCoverMedia} from "@/lib/types/admin.types";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";


interface MissingCoverQueueProps {
    items: AdminMissingCoverMedia[];
    selected: AdminMissingCoverMedia;
    onSelect: (media: AdminMissingCoverMedia) => void;
}


export function MissingCoverQueue({ items, selected, onSelect }: MissingCoverQueueProps) {
    return (
        <div className="flex min-w-0 flex-col gap-3">
            <ul className="max-h-64 overflow-y-auto scrollbar-thin rounded-lg border lg:max-h-150" aria-label="Media without covers">
                {items.map(item => {
                    const key = `${item.mediaType}:${item.mediaId}`;
                    const isSelected = item.mediaType === selected.mediaType && item.mediaId === selected.mediaId;

                    return (
                        <li key={key} className="border-b last:border-b-0">
                            <Button
                                type="button"
                                aria-pressed={isSelected}
                                onClick={() => onSelect(item)}
                                variant={isSelected ? "secondary" : "hover"}
                                className="h-auto w-full justify-start gap-3 rounded-none px-4 py-3 text-left whitespace-normal"
                            >
                                <MainThemeIcon type={item.mediaType} className="shrink-0"/>
                                <span className="flex min-w-0 flex-col gap-1">
                                    <span className="wrap-anywhere font-medium">
                                        {item.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {capitalize(item.mediaType)}
                                        {" · "}{item.releaseDate?.slice(0, 4) ?? "Release date unknown"}
                                        {" · "}#{item.mediaId}
                                    </span>
                                </span>
                            </Button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
