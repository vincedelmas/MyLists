import {useId, useRef} from "react";
import {CreateCollection} from "@/lib/schemas";
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
import {useConfirmBlocker} from "@/lib/client/hooks/use-confirm-blocker";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {RadioGroup, RadioGroupItem} from "@/lib/client/components/ui/radio-group";
import {MainThemeIcon, PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {CollectionSearch} from "@/lib/client/components/collections/CollectionSearch";
import {Controller, FormProvider, useFieldArray, UseFormReturn, useWatch} from "react-hook-form";
import {Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle} from "@/lib/client/components/ui/field";


interface CollectionEditorProps {
    submitLabel: string;
    mediaType: MediaType;
    isSubmitting?: boolean;
    form: UseFormReturn<CreateCollection>;
    onSubmit: (values: CreateCollection) => void;
}


export const CollectionEditor = ({ form, onSubmit, mediaType, submitLabel, isSubmitting }: CollectionEditorProps) => {
    const fieldId = useId();
    const { isDirty } = form.formState;
    const ordered = useWatch({ control: form.control, name: "ordered" });
    const orderedLabel = ordered ? "Ranked" : "Unranked";
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
                <FieldSet disabled={isSubmitting}>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-col gap-2">
                            <h2 className="font-semibold tracking-tight">
                                2. Collection details
                            </h2>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="capitalize">
                                    <MainThemeIcon type={mediaType}/> {mediaType}
                                </Badge>
                                <Badge variant="outline">
                                    {ordered
                                        ? <ListOrdered className="size-3"/>
                                        : <List className="size-3"/>
                                    }
                                    {orderedLabel}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-6">
                        <FieldGroup className="col-span-8 gap-6 max-lg:col-span-12">
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
                                            id={`${fieldId}-description`}
                                            value={field.value ?? ""}
                                            placeholder="What is this collection about?"
                                            aria-invalid={fieldState.invalid}
                                        />
                                        <div className="flex justify-between items-center">
                                            <FieldError errors={[fieldState.error]}/>
                                            <span className="text-[10px] text-muted-foreground">
                                            {field.value?.length || 0} / 400
                                        </span>
                                        </div>
                                    </Field>
                                }
                            />

                            <Controller
                                name="items"
                                control={form.control}
                                render={({ fieldState }) => (
                                    <Field data-invalid={fieldState.invalid} data-disabled={isSubmitting}>
                                        <FieldTitle id={`${fieldId}-items`}>Items ({fields.length})</FieldTitle>
                                        <CollectionSearch
                                            onAdd={handleAddItem}
                                            mediaType={mediaType}
                                            disabled={isSubmitting}
                                        />
                                        <FieldError errors={[fieldState.error]}/>

                                        {fields.length === 0 ?
                                            <EmptyState
                                                className="py-20"
                                                icon={ListOrdered}
                                                message="No items added to the collection yet."
                                            />
                                            :
                                            <div className="flex max-h-128 flex-col gap-3 overflow-y-auto pr-2 pt-3 scrollbar-thin">
                                                {fields.map((field, idx) =>
                                                    <div
                                                        key={field.id}
                                                        draggable={ordered}
                                                        onDrop={() => handleDrop(idx)}
                                                        onDragEnd={() => dragIndex.current = null}
                                                        onDragOver={(ev) => ordered && ev.preventDefault()}
                                                        className="flex items-center gap-3 rounded-lg border bg-background p-3"
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
                                                        <div className="h-20 w-14 overflow-hidden rounded-md bg-muted">
                                                            <img
                                                                alt={field.mediaName}
                                                                src={field.mediaCover}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        </div>
                                                        <div className="flex flex-1 flex-col gap-2">
                                                            <div className="line-clamp-1 font-semibold">
                                                                {field.mediaName}
                                                            </div>
                                                            <Input
                                                                placeholder="Add annotation..."
                                                                {...form.register(`items.${idx}.annotation`)}
                                                            />
                                                        </div>
                                                        <Button type="button" size="icon" variant="ghost" onClick={() => remove(idx)}>
                                                            <Trash2 className="size-4"/>
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        }
                                    </Field>
                                )}
                            />
                        </FieldGroup>

                        <div className="col-span-4 flex flex-col gap-6 max-lg:col-span-12">
                            <FieldGroup className="gap-5 rounded-lg border p-4">
                                <Controller
                                    name="privacy"
                                    control={form.control}
                                    render={({ field, fieldState }) =>
                                        <Field data-invalid={fieldState.invalid} data-disabled={isSubmitting}>
                                            <FieldSet>
                                                <FieldLegend id={`${fieldId}-privacy`} className="text-base">Privacy Settings</FieldLegend>
                                                <RadioGroup
                                                    value={field.value}
                                                    onValueChange={field.onChange}
                                                    aria-invalid={fieldState.invalid}
                                                    aria-labelledby={`${fieldId}-privacy`}
                                                >
                                                    {[PrivacyType.PRIVATE, PrivacyType.RESTRICTED, PrivacyType.PUBLIC].map((pt) =>
                                                        <Field key={pt} orientation="horizontal">
                                                            <RadioGroupItem id={`${fieldId}-privacy-${pt}`} value={pt}/>
                                                            <FieldContent>
                                                                <FieldLabel
                                                                    htmlFor={`${fieldId}-privacy-${pt}`}
                                                                    className="flex items-center gap-1 font-normal"
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
                                            className="justify-between rounded-md border px-3 py-2"
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
                        </div>
                    </div>
                </FieldSet>
                <FormError/>
                <div className="flex justify-end">
                    <FormSubmitButton disabled={!isDirty} isLoading={isSubmitting}>
                        {submitLabel}
                    </FormSubmitButton>
                </div>
            </form>
        </FormProvider>
    );
};
