import type {CreateCollection} from "@/lib/schemas";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {Controller, useFormContext} from "react-hook-form";
import {Field, FieldError} from "@/lib/client/components/ui/field";
import {ArrowDown, ArrowUp, GripVertical, Trash2} from "lucide-react";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";


interface CollectionItemEditorProps {
    index: number;
    isLast: boolean;
    ordered: boolean;
    disabled?: boolean;
    onRemove: (index: number) => void;
    item: CreateCollection["items"][number];
    onMove: (from: number, to: number) => void;
}


export const CollectionItemEditor = ({ item, index, isLast, ordered, disabled, onMove, onRemove }: CollectionItemEditorProps) => {
    const { control } = useFormContext<CreateCollection>();

    return (
        <>
            {ordered &&
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <span className="w-6 text-center text-xs font-semibold">
                        #{index + 1}
                    </span>
                    <GripVertical className="size-4 cursor-grab"/>
                </div>
            }

            <div className="h-16 w-11 shrink-0 overflow-hidden rounded-md bg-muted">
                <img
                    loading="lazy"
                    alt={item.mediaName}
                    src={item.mediaCover}
                    className="h-full w-full object-cover"
                />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex min-w-0 items-center gap-2">
                    <MainThemeIcon
                        type={item.mediaType}
                        className="size-3.5 shrink-0 text-muted-foreground"
                    />
                    <span className="truncate text-sm font-semibold">
                        {item.mediaName}
                    </span>
                </div>
                <Controller
                    control={control}
                    name={`items.${index}.annotation`}
                    render={({ field, fieldState }) =>
                        <Field data-invalid={fieldState.invalid} data-disabled={disabled}>
                            <Input
                                {...field}
                                disabled={disabled}
                                value={field.value ?? ""}
                                placeholder="Add annotation..."
                                aria-invalid={fieldState.invalid}
                                aria-label={`Annotation for ${item.mediaName}`}
                            />
                            <FieldError errors={[fieldState.error]}/>
                        </Field>
                    }
                />
            </div>
            <div className="flex shrink-0 flex-col items-center gap-1 sm:flex-row">
                {ordered &&
                    <div className="flex flex-col gap-1">
                        <Button
                            type="button"
                            size="icon-xs"
                            variant="ghost"
                            disabled={disabled || index === 0}
                            aria-label={`Move ${item.mediaName} up`}
                            onClick={() => onMove(index, index - 1)}
                        >
                            <ArrowUp/>
                        </Button>
                        <Button
                            type="button"
                            size="icon-xs"
                            variant="ghost"
                            disabled={disabled || isLast}
                            aria-label={`Move ${item.mediaName} down`}
                            onClick={() => onMove(index, index + 1)}
                        >
                            <ArrowDown/>
                        </Button>
                    </div>
                }
                <Button
                    type="button"
                    size="icon-sm"
                    disabled={disabled}
                    variant="destructiveGhost"
                    onClick={() => onRemove(index)}
                    aria-label={`Remove ${item.mediaName}`}
                >
                    <Trash2/>
                </Button>
            </div>
        </>
    );
};
