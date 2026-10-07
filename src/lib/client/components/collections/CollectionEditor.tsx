import {PrivacyType} from "@/lib/utils/enums";
import type {CreateCollection} from "@/lib/schemas";
import {type ReactNode, useId, useRef} from "react";
import {toast} from "@/lib/client/components/ui/toast";
import {Badge} from "@/lib/client/components/ui/badge";
import {Input} from "@/lib/client/components/ui/input";
import {Switch} from "@/lib/client/components/ui/switch";
import {Button} from "@/lib/client/components/ui/button";
import type {DraftItem} from "@/lib/types/collections.types";
import {Textarea} from "@/lib/client/components/ui/textarea";
import {FormError} from "@/lib/client/components/forms/FormError";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {useConfirmBlocker} from "@/lib/client/hooks/use-confirm-blocker";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {RadioGroup, RadioGroupItem} from "@/lib/client/components/ui/radio-group";
import {MainThemeIcon, PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {CollectionSearch} from "@/lib/client/components/collections/CollectionSearch";
import {Card, CardContent, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {ArrowDown, ArrowUp, GripVertical, List, ListOrdered, Trash2} from "lucide-react";
import {CollectionMediaTypes} from "@/lib/client/components/collections/CollectionMediaTypes";
import {Controller, FormProvider, useFieldArray, type UseFormReturn, useWatch} from "react-hook-form";
import {Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle} from "@/lib/client/components/ui/field";


interface CollectionEditorProps {
    submitLabel: string;
    isSubmitting?: boolean;
    footerStart?: ReactNode;
    form: UseFormReturn<CreateCollection>;
    onSubmit: (values: CreateCollection) => void;
}


export const CollectionEditor = ({ form, onSubmit, submitLabel, footerStart, isSubmitting }: CollectionEditorProps) => {
    const fieldId = useId();
    const { isDirty } = form.formState;
    const ordered = useWatch({ control: form.control, name: "ordered" });

    const EmptyIcon = ordered ? ListOrdered : List;
    const dragIndex = useRef<number | null>(null);
    const { fields, append, remove, move } = useFieldArray({ control: form.control, name: "items" });
    const mediaTypes = ALL_MEDIA_TYPES.filter(mediaType => fields.some(field => field.mediaType === mediaType));

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
        if (fields.some(field => field.mediaType === item.mediaType && field.mediaId === item.mediaId)) {
            toast.add({ title: "That media is already in your collection.", type: "warning" });
            return;
        }

        append({ ...item, annotation: "" }, { shouldFocus: false });
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
                <FieldSet disabled={isSubmitting}>
                    <div className="grid grid-cols-[minmax(0,1fr)_20rem] items-start gap-10 max-lg:grid-cols-1">
                        <div className="flex min-w-0 flex-col gap-7">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Collection details</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <FieldGroup className="gap-5">
                                        <Controller
                                            name="title"
                                            control={form.control}
                                            render={({ field, fieldState }) =>
                                                <Field data-invalid={fieldState.invalid} data-disabled={isSubmitting}>
                                                    <FieldLabel htmlFor={`${fieldId}-title`}>
                                                        Title
                                                    </FieldLabel>
                                                    <Input
                                                        {...field}
                                                        id={`${fieldId}-title`}
                                                        aria-invalid={fieldState.invalid}
                                                        placeholder="Ex: The Dune universe"
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
                                                    <FieldLabel htmlFor={`${fieldId}-description`}>
                                                        Description
                                                    </FieldLabel>
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
                                </CardContent>
                            </Card>

                            <Controller
                                name="items"
                                control={form.control}
                                render={({ fieldState }) => (
                                    <Field data-invalid={fieldState.invalid} data-disabled={isSubmitting}>
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
                                            disabled={isSubmitting}
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
                                                        draggable={ordered && !isSubmitting}
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
                                                            <Input
                                                                placeholder="Add annotation..."
                                                                aria-label={`Annotation for ${field.mediaName}`}
                                                                {...form.register(`items.${idx}.annotation`)}
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
                                                    Show numbered ranks. Drag titles or use the arrows to change their order.
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
