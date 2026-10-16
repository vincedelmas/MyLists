import {SearchX} from "lucide-react";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {displayContainerError} from "@/lib/client/error-display";
import {type ComponentProps, type ReactNode, useState} from "react";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxStatus} from "@/lib/client/components/ui/combobox";


interface SearchSelectProps<T> extends Omit<ComponentProps<typeof ComboboxInput>, "value" | "onChange" | "onKeyDown" | "onSelect" | "type"> {
    search: string;
    footer?: ReactNode;
    items: readonly T[];
    isPending?: boolean;
    emptyMessage: string;
    error?: Error | null;
    getItemKey: (item: T) => string;
    getItemLabel: (item: T) => string;
    renderItem?: (item: T) => ReactNode;
    isItemDisabled?: (item: T) => boolean;
    onSearchChange: (search: string) => void;
    onSelect: (item: T) => void | Promise<void>;
}


export const SearchSelect = <T, >(props: SearchSelectProps<T>) => {
    const {
        items,
        error,
        search,
        footer,
        onSelect,
        disabled,
        readOnly,
        getItemKey,
        renderItem,
        emptyMessage,
        getItemLabel,
        isItemDisabled,
        onSearchChange,
        isPending = false,
        ...inputProps
    } = props;

    const [open, setOpen] = useState(false);
    const [selecting, setSelecting] = useState(false);

    const availableItems = isPending || error ? [] : items;

    return (
        <Combobox<T>
            value={null}
            filter={null}
            disabled={disabled}
            inputValue={search}
            autoHighlight={true}
            items={availableItems}
            readOnly={readOnly || selecting}
            itemToStringLabel={getItemLabel}
            open={open && search.trim().length >= 2 && !disabled}
            onOpenChange={(nextOpen, details) => {
                if (!nextOpen && details.reason === "item-press") {
                    details.cancel();
                    return;
                }
                setOpen(nextOpen);
                if (!nextOpen && !selecting) onSearchChange("");
            }}
            onInputValueChange={(value, details) => {
                if (details.reason === "item-press") {
                    details.cancel();
                    return;
                }
                onSearchChange(value);
            }}
            onValueChange={async item => {
                if (item === null) return;
                setSelecting(true);
                try {
                    await onSelect(item);
                    onSearchChange("");
                    setOpen(false);
                }
                catch {
                    // The mutation reports error
                }
                finally {
                    setSelecting(false);
                }
            }}
        >
            <ComboboxInput
                {...inputProps}
                onKeyDown={ev => {
                    if (ev.key === "Enter" && !ev.nativeEvent.isComposing && !ev.currentTarget.getAttribute("aria-activedescendant")) {
                        ev.preventDefault();
                        ev.preventBaseUIHandler();
                    }
                }}
            />
            <ComboboxContent aria-busy={selecting || isPending}>
                <ComboboxStatus>
                    {isPending &&
                        <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
                            <Spinner aria-hidden="true"/> Searching…
                        </div>
                    }
                    {!isPending && error &&
                        <div className="p-4 text-center text-sm text-destructive">
                            {displayContainerError({ error })}
                        </div>
                    }
                </ComboboxStatus>
                <ComboboxEmpty>
                    {!isPending && !error &&
                        <EmptyState
                            icon={SearchX}
                            className="py-4"
                            message={emptyMessage}
                        />
                    }
                </ComboboxEmpty>
                <ComboboxList>
                    {(item: T) =>
                        <ComboboxItem key={getItemKey(item)} value={item} disabled={selecting || isItemDisabled?.(item)}>
                            {renderItem ?
                                renderItem(item)
                                :
                                <span className="truncate">
                                    {getItemLabel(item)}
                                </span>
                            }
                        </ComboboxItem>
                    }
                </ComboboxList>
                {footer &&
                    <div className="shrink-0 border-t p-2">
                        {footer}
                    </div>
                }
            </ComboboxContent>
        </Combobox>
    );
};
