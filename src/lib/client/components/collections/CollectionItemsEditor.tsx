import {useId, useRef} from "react";
import type {CreateCollection} from "@/lib/schemas";
import {toast} from "@/lib/client/components/ui/toast";
import {Badge} from "@/lib/client/components/ui/badge";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import type {DraftItem} from "@/lib/types/collections.types";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {Controller, useFieldArray, useFormContext, useWatch} from "react-hook-form";
import {CollectionSearch} from "@/lib/client/components/collections/CollectionSearch";
import {ArrowDown, ArrowUp, GripVertical, List, ListOrdered, Trash2} from "lucide-react";
import {CollectionMediaTypes} from "@/lib/client/components/collections/CollectionMediaTypes";
import {Field, FieldDescription, FieldError, FieldTitle} from "@/lib/client/components/ui/field";


interface CollectionItemsEditorProps {
    disabled?: boolean;
}


export const CollectionItemsEditor = ({ disabled }: CollectionItemsEditorProps) => {
    const fieldId = useId();
    const form = useFormContext<CreateCollection>();
    const dragIndex = useRef<number | null>(null);
    const ordered = useWatch({ control: form.control, name: "ordered" });
    const { fields, append, remove, move } = useFieldArray({ control: form.control, name: "items" });

    const EmptyIcon = ordered ? ListOrdered : List;
    const mediaTypes = ALL_MEDIA_TYPES.filter(mediaType => fields.some(field => field.mediaType === mediaType));

    const handleDrop = (index: number) => {
        if (dragIndex.current === null || dragIndex.current === index) return;
        move(dragIndex.current, index);
        dragIndex.current = null;
    };

    const handleAddItem = (item: DraftItem) => {
        if (fields.some(field => field.mediaType === item.mediaType && field.mediaId === item.mediaId)) {
            toast.add({ title: "That media is already in your collection.", type: "warning" });
            return;
        }

        append({ ...item, annotation: "" }, { shouldFocus: false });
    };

    return (
        <Controller
            name="items"
            control={form.control}
            render={({ fieldState }) => (
                <Field data-invalid={fieldState.invalid} data-disabled={disabled}>
                    <div className="flex items-center justify-between gap-4">
                        <FieldTitle id={`${fieldId}-items`}>
                            Media in this collection
                        </FieldTitle>
                        <Badge variant="outline">
                            {fields.length} media
                        </Badge>
                    </div>
                    <FieldDescription>
                        Search one media type at a time. Combine titles from any type and add your own notes.
                    </FieldDescription>

                    {mediaTypes.length > 0 &&
                        <div className="flex flex-wrap gap-2">
                            <CollectionMediaTypes
                                mediaTypes={mediaTypes}
                            />
                        </div>
                    }

                    <CollectionSearch
                        onAdd={handleAddItem}
                        disabled={disabled}
                        initialMediaType={fields[0]?.mediaType}
                    />

                    <FieldError errors={[fieldState.error]}/>

                    {fields.length === 0 ?
                        <EmptyState
                            className="py-16"
                            icon={EmptyIcon}
                            message="No items added to the collection yet."
                        />
                        :
                        <div className="mt-2 flex flex-col rounded-xl border px-3">
                            {fields.map((field, idx) =>
                                <div
                                    key={field.id}
                                    draggable={ordered && !disabled}
                                    onDrop={() => handleDrop(idx)}
                                    onDragEnd={() => dragIndex.current = null}
                                    onDragOver={(ev) => ordered && ev.preventDefault()}
                                    className="flex items-center gap-3 border-b py-3 pr-1 last:border-b-0"
                                    onDragStart={() => {
                                        if (ordered) dragIndex.current = idx;
                                    }}
                                >
                                    {ordered &&
                                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                            <span className="w-6 text-center text-xs font-semibold">
                                                #{idx + 1}
                                            </span>
                                            <GripVertical className="size-4 cursor-grab"/>
                                        </div>
                                    }

                                    <div className="h-16 w-11 shrink-0 overflow-hidden rounded-md bg-muted">
                                        <img
                                            loading="lazy"
                                            alt={field.mediaName}
                                            src={field.mediaCover}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <MainThemeIcon
                                                type={field.mediaType}
                                                className="size-3.5 shrink-0 text-muted-foreground"
                                            />
                                            <span className="truncate text-sm font-semibold">
                                                {field.mediaName}
                                            </span>
                                        </div>
                                        <Controller
                                            control={form.control}
                                            name={`items.${idx}.annotation`}
                                            render={({ field: annotationField, fieldState }) =>
                                                <Field data-invalid={fieldState.invalid} data-disabled={disabled}>
                                                    <Input
                                                        {...annotationField}
                                                        placeholder="Add annotation..."
                                                        aria-invalid={fieldState.invalid}
                                                        value={annotationField.value ?? ""}
                                                        aria-label={`Annotation for ${field.mediaName}`}
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
                                                    disabled={idx === 0}
                                                    onClick={() => move(idx, idx - 1)}
                                                    aria-label={`Move ${field.mediaName} up`}
                                                >
                                                    <ArrowUp/>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="icon-xs"
                                                    variant="ghost"
                                                    disabled={idx === fields.length - 1}
                                                    onClick={() => move(idx, idx + 1)}
                                                    aria-label={`Move ${field.mediaName} down`}
                                                >
                                                    <ArrowDown/>
                                                </Button>
                                            </div>
                                        }
                                        <Button
                                            type="button"
                                            size="icon-sm"
                                            variant="destructiveGhost"
                                            onClick={() => remove(idx)}
                                            aria-label={`Remove ${field.mediaName}`}
                                        >
                                            <Trash2/>
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    }
                </Field>
            )}
        />
    );
};
