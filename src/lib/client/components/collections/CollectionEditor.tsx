import {CreateCollection} from "@/lib/schemas";
import {ReactNode, useId, useRef} from "react";
import {toast} from "@/lib/client/components/ui/toast";
import {Badge} from "@/lib/client/components/ui/badge";
import {Input} from "@/lib/client/components/ui/input";
import {DraftItem} from "@/lib/types/collections.types";
import {Switch} from "@/lib/client/components/ui/switch";
import {Button} from "@/lib/client/components/ui/button";
import {MediaType, PrivacyType} from "@/lib/utils/enums";
import {Textarea} from "@/lib/client/components/ui/textarea";
import {FormError} from "@/lib/client/components/forms/FormError";
import {GripVertical, List, ListOrdered, Trash2} from "lucide-react";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {useConfirmBlocker} from "@/lib/client/hooks/use-confirm-blocker";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {RadioGroup, RadioGroupItem} from "@/lib/client/components/ui/radio-group";
import {CollectionSearch} from "@/lib/client/components/collections/CollectionSearch";
import {Controller, FormProvider, useFieldArray, UseFormReturn, useWatch} from "react-hook-form";
import {Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle} from "@/lib/client/components/ui/field";


interface CollectionEditorProps {
    submitLabel: string;
    mediaType: MediaType;
    footerStart?: ReactNode;
    isSubmitting?: boolean;
    form: UseFormReturn<CreateCollection>;
    onSubmit: (values: CreateCollection) => void;
}


export const CollectionEditor = ({ form, onSubmit, mediaType, submitLabel, footerStart, isSubmitting }: CollectionEditorProps) => {
    const fieldId = useId();
    const { isDirty } = form.formState;
    const ordered = useWatch({ control: form.control, name: "ordered" });

    const EmptyIcon = ordered ? ListOrdered : List;
    const dragIndex = useRef<number | null>(null);
    const { fields, append, remove, move } = useFieldArray({ control: form.control, name: "items" });

    useConfirmBlocker({
        cancelLabel: "Stay",
        confirmLabel: "Leave",
        variant: "destructive",
        when: isDirty && !isSubmitting,
        title: "Leave without saving?",
        description: "Your collection edits will be lost if you leave this page.",
    });

    const handleDrop = (index: number) => {
        if (dragIndex.current === null || dragIndex.current === index) return;
        move(dragIndex.current, index);
        dragIndex.current = null;
    };

    const handleAddItem = (item: DraftItem) => {
        if (fields.some((field) => field.mediaId === item.mediaId)) {
            toast.add({ title: "That media is already in your collection.", type: "warning" });
            return;
        }

        append({
            annotation: "",
            mediaId: item.mediaId,
            mediaName: item.mediaName,
            mediaCover: item.mediaCover,
        }, { shouldFocus: false });
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
                <FieldSet disabled={isSubmitting}>
                    <div className="grid grid-cols-[minmax(0,1fr)_20rem] items-start gap-10 max-lg:grid-cols-1">
                        <div className="min-w-0 space-y-7">
                            <section className="rounded-xl border p-5 shadow-xs sm:p-6">
                                <h2 className="mb-4 text-sm font-semibold text-foreground">
                                    Collection details
                                </h2>
                                <FieldGroup className="gap-5">
                                    <Controller
                                        name="title"
                                        control={form.control}
                                        render={({ field, fieldState }) =>
                                            <Field data-invalid={fieldState.invalid} data-disabled={isSubmitting}>
                                                <FieldLabel htmlFor={`${fieldId}-title`}>Title</FieldLabel>
                                                <Input
                                                    {...field}
                                                    id={`${fieldId}-title`}
                                                    aria-invalid={fieldState.invalid}
                                                    placeholder="Ex: Top 50 Animated Films"
                                                />
                                                <FieldError errors={[fieldState.error]}/>
                                            </Field>
                                        }
                                    />
                                    <Controller
                                        name="description"
                                        control={form.control}
                                        render={({ field, fieldState }) =>
                                            <Field data-invalid={fieldState.invalid} data-disabled={isSubmitting}>
                                                <FieldLabel htmlFor={`${fieldId}-description`}>Description</FieldLabel>
                                                <Textarea
                                                    {...field}
                                                    rows={4}
                                                    value={field.value ?? ""}
                                                    id={`${fieldId}-description`}
                                                    aria-invalid={fieldState.invalid}
                                                    placeholder="What is this collection about?"
                                                />
                                                <div className="flex items-center justify-between">
                                                    <FieldError errors={[fieldState.error]}/>
                                                    <span className="text-[10px] tabular-nums text-muted-foreground">
                                                        {field.value?.length || 0} / 400
                                                    </span>
                                                </div>
                                            </Field>
                                        }
                                    />
                                </FieldGroup>
                            </section>

                            <Controller
                                name="items"
                                control={form.control}
                                render={({ fieldState }) => (
                                    <Field data-invalid={fieldState.invalid} data-disabled={isSubmitting}>
                                        <div className="flex items-center justify-between gap-4">
                                            <FieldTitle id={`${fieldId}-items`}>Items</FieldTitle>
                                            <Badge variant="outline">
                                                {fields.length} {fields.length === 1 ? "title" : "titles"}
                                            </Badge>
                                        </div>
                                        <FieldDescription>
                                            Search for titles, add an optional note, and reorder them when ranking is enabled.
                                        </FieldDescription>
                                        <CollectionSearch
                                            onAdd={handleAddItem}
                                            mediaType={mediaType}
                                            disabled={isSubmitting}
                                        />
                                        <FieldError errors={[fieldState.error]}/>

                                        {fields.length === 0 ?
                                            <EmptyState
                                                className="py-16"
                                                icon={EmptyIcon}
                                                message="No items added to the collection yet."
                                            />
                                            :
                                            <div className="mt-2 flex max-h-128 flex-col overflow-y-auto rounded-xl border px-3 scrollbar-thin">
                                                {fields.map((field, idx) =>
                                                    <div
                                                        key={field.id}
                                                        draggable={ordered}
                                                        onDrop={() => handleDrop(idx)}
                                                        onDragEnd={() => dragIndex.current = null}
                                                        onDragOver={(ev) => ordered && ev.preventDefault()}
                                                        className="flex items-center gap-3 border-b py-2.5 pr-1 last:border-b-0"
                                                        onDragStart={() => {
                                                            if (ordered) dragIndex.current = idx;
                                                        }}
                                                    >
                                                        {ordered &&
                                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                            <span className="w-6 text-center text-xs font-semibold">
                                                                {idx + 1}
                                                            </span>
                                                                <GripVertical className="size-4 cursor-grab"/>
                                                            </div>
                                                        }
                                                        <div className="h-16 w-11 shrink-0 overflow-hidden rounded-md bg-muted">
                                                            <img
                                                                alt={field.mediaName}
                                                                src={field.mediaCover}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        </div>
                                                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                                                            <div className="truncate text-sm font-semibold">
                                                                {field.mediaName}
                                                            </div>
                                                            <Input
                                                                placeholder="Add annotation..."
                                                                {...form.register(`items.${idx}.annotation`)}
                                                            />
                                                        </div>
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
                                                )}
                                            </div>
                                        }
                                    </Field>
                                )}
                            />
                        </div>

                        <aside className="rounded-xl border p-5 shadow-xs sm:p-6">
                            <FieldGroup className="gap-6">
                                <Controller
                                    name="privacy"
                                    control={form.control}
                                    render={({ field, fieldState }) =>
                                        <Field data-invalid={fieldState.invalid} data-disabled={isSubmitting}>
                                            <FieldSet>
                                                <FieldLegend id={`${fieldId}-privacy`} className="text-sm font-semibold mb-3">
                                                    Visibility
                                                </FieldLegend>
                                                <RadioGroup
                                                    value={field.value}
                                                    onValueChange={field.onChange}
                                                    aria-invalid={fieldState.invalid}
                                                    aria-labelledby={`${fieldId}-privacy`}
                                                >
                                                    {[PrivacyType.PRIVATE, PrivacyType.RESTRICTED, PrivacyType.PUBLIC].map((pt) =>
                                                        <Field key={pt} orientation="horizontal" className="mb-2">
                                                            <RadioGroupItem
                                                                value={pt}
                                                                id={`${fieldId}-privacy-${pt}`}
                                                            />
                                                            <FieldContent>
                                                                <FieldLabel
                                                                    htmlFor={`${fieldId}-privacy-${pt}`}
                                                                    className="flex items-center gap-1.5 font-normal"
                                                                >
                                                                    <PrivacyIcon type={pt}/>
                                                                    {pt === PrivacyType.RESTRICTED
                                                                        ? "Profile Only" : pt === PrivacyType.PRIVATE
                                                                            ? "Only Me" : "Public"
                                                                    }
                                                                </FieldLabel>
                                                                <FieldDescription className="text-xs">
                                                                    {pt === PrivacyType.PRIVATE &&
                                                                        <span>
                                                                        Visible only to you. Hidden from profiles,
                                                                        direct links, and discovery.
                                                                    </span>
                                                                    }
                                                                    {pt === PrivacyType.RESTRICTED &&
                                                                        <span>
                                                                        Hidden from community discovery. Visible to people
                                                                        who can view your profile: everyone if public,
                                                                        signed-in users if restricted, approved followers
                                                                        if private.
                                                                    </span>
                                                                    }
                                                                    {pt === PrivacyType.PUBLIC &&
                                                                        <span>
                                                                        Visible to everyone by direct link and in community
                                                                        discovery, even if your account is private.
                                                                    </span>
                                                                    }
                                                                </FieldDescription>
                                                            </FieldContent>
                                                        </Field>
                                                    )}
                                                </RadioGroup>
                                            </FieldSet>
                                            <FieldError errors={[fieldState.error]}/>
                                        </Field>
                                    }
                                />

                                <Controller
                                    name="ordered"
                                    control={form.control}
                                    render={({ field, fieldState }) =>
                                        <Field
                                            orientation="horizontal"
                                            data-disabled={isSubmitting}
                                            data-invalid={fieldState.invalid}
                                            className="justify-between border-t pt-5"
                                        >
                                            <FieldContent>
                                                <FieldLabel htmlFor={`${fieldId}-ordered`} className="text-sm font-semibold">
                                                    Ranked list
                                                </FieldLabel>
                                                <FieldDescription className="text-xs">
                                                    Enable drag & drop ranking.
                                                </FieldDescription>
                                                <FieldError errors={[fieldState.error]}/>
                                            </FieldContent>
                                            <Switch
                                                checked={field.value}
                                                id={`${fieldId}-ordered`}
                                                onCheckedChange={field.onChange}
                                                aria-invalid={fieldState.invalid}
                                            />
                                        </Field>
                                    }
                                />
                            </FieldGroup>
                        </aside>
                    </div>
                </FieldSet>
                <FormError/>
                <div className="mt-6 flex items-center justify-between gap-3 border-t pt-4 max-sm:flex-col-reverse max-sm:items-stretch">
                    {footerStart && <div>{footerStart}</div>}
                    <FormSubmitButton className="ml-auto max-sm:ml-0" disabled={!isDirty} isLoading={isSubmitting}>
                        {submitLabel}
                    </FormSubmitButton>
                </div>
            </form>
        </FormProvider>
    );
};
