import {toast} from "sonner";
import {useRef} from "react";
import {CreateCollection} from "@/lib/schemas";
import {useBlocker} from "@tanstack/react-router";
import {useSelector} from "@tanstack/react-store";
import {Badge} from "@/lib/client/components/ui/badge";
import {Input} from "@/lib/client/components/ui/input";
import {DraftItem} from "@/lib/types/collections.types";
import {Switch} from "@/lib/client/components/ui/switch";
import {Button} from "@/lib/client/components/ui/button";
import {MediaType, PrivacyType} from "@/lib/utils/enums";
import {withForm} from "@/lib/client/components/forms/form";
import {Textarea} from "@/lib/client/components/ui/textarea";
import {GripVertical, List, ListOrdered, Trash2} from "lucide-react";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {RadioGroup, RadioGroupItem} from "@/lib/client/components/ui/radio-group";
import {MainThemeIcon, PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {CollectionSearch} from "@/lib/client/components/collections/CollectionSearch";
import {Field, FieldDescription, FieldError, FieldLabel} from "@/lib/client/components/ui/field";


export const collectionDefaultValues: CreateCollection = {
    title: "",
    items: [],
    ordered: false,
    description: "",
    mediaType: MediaType.MOVIES,
    privacy: PrivacyType.PRIVATE,
};


export const CollectionEditor = withForm({
    defaultValues: collectionDefaultValues,
    props: {
        submitLabel: "",
        mediaType: MediaType.MOVIES as MediaType,
    },
    render: function CollectionEditorForm({ form, mediaType, submitLabel }) {
        const dragIndex = useRef<number | null>(null);
        const { isDirty, isSubmitting, ordered } = useSelector(form.store, (state) => ({
            isDirty: state.isDirty,
            ordered: state.values.ordered,
            isSubmitting: state.isSubmitting,
        }));
        const orderedLabel = ordered ? "Ranked" : "Unranked";

        useBlocker({
            shouldBlockFn: () => {
                if (!isDirty || isSubmitting) return false;
                return !confirm("Your edit will be lost. Are you sure you want to leave this page?");
            },
        });

        const handleDrop = (index: number) => {
            if (dragIndex.current === null || dragIndex.current === index) return;
            form.moveFieldValues("items", dragIndex.current, index);
            dragIndex.current = null;
        };

        const handleAddItem = (item: DraftItem) => {
            if (form.state.values.items.some((field) => field.mediaId === item.mediaId)) {
                toast.warning("Media already in your collection.");
                return;
            }

            void form.pushFieldValue("items", {
                annotation: "",
                mediaId: item.mediaId,
                mediaName: item.mediaName,
                mediaCover: item.mediaCover,
            });
        };

        return (
            <form.AppForm>
                <form.FormRoot className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-2">
                            <h2 className="font-semibold tracking-tight">
                                2. Collection details
                            </h2>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="outline" className="gap-1 text-xs capitalize">
                                    <MainThemeIcon type={mediaType} size={14}/> {mediaType}
                                </Badge>
                                <Badge variant="outline" className="gap-1 text-xs">
                                    {ordered ? <ListOrdered className="size-3"/> : <List className="size-3"/>}
                                    {orderedLabel}
                                </Badge>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <form.SubmitButton
                                label={submitLabel}
                                requireDirty={true}
                            />
                        </div>
                    </div>
                    <form.FormFieldset>
                        <div className="grid grid-cols-12 gap-6">
                            <div className="col-span-8 space-y-6 max-lg:col-span-12">
                                <form.AppField name="title">
                                    {(field) =>
                                        <field.TextField
                                            label="Title"
                                            placeholder="Ex: Top 50 Animated Films"
                                        />
                                    }
                                </form.AppField>

                                <form.AppField name="description">
                                    {(field) => {
                                        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                                        return (
                                            <Field data-invalid={isInvalid}>
                                                <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                                                <Textarea
                                                    id={field.name}
                                                    name={field.name}
                                                    aria-invalid={isInvalid}
                                                    onBlur={field.handleBlur}
                                                    value={field.state.value ?? ""}
                                                    placeholder="What is this collection about?"
                                                    onChange={(ev) => field.handleChange(ev.target.value)}
                                                />
                                                <div className="flex items-center justify-between">
                                                    {isInvalid ? <FieldError errors={field.state.meta.errors}/> : <span/>}
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {field.state.value?.length || 0} / 400
                                                    </span>
                                                </div>
                                            </Field>
                                        );
                                    }}
                                </form.AppField>

                                <form.AppField name="items" mode="array">
                                    {(itemsField) => {
                                        const fields = itemsField.state.value;
                                        const isInvalid = itemsField.state.meta.isTouched && !itemsField.state.meta.isValid;

                                        return (
                                            <Field data-invalid={isInvalid}>
                                                <FieldLabel>Items ({fields.length})</FieldLabel>
                                                <CollectionSearch
                                                    onAdd={handleAddItem}
                                                    mediaType={mediaType}
                                                    disabled={isSubmitting}
                                                />
                                                {isInvalid &&
                                                    <FieldError
                                                        errors={itemsField.state.meta.errors}
                                                    />
                                                }

                                                {fields.length === 0 ?
                                                    <EmptyState
                                                        className="py-20"
                                                        icon={ListOrdered}
                                                        message="No items added to the collection yet."
                                                    />
                                                    :
                                                    <div className="space-y-3 pt-3">
                                                        {fields.map((item, idx) =>
                                                            <div
                                                                key={item.mediaId}
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
                                                                        alt={item.mediaName}
                                                                        src={item.mediaCover}
                                                                        className="h-full w-full object-cover"
                                                                    />
                                                                </div>
                                                                <div className="flex-1 space-y-2">
                                                                    <div className="line-clamp-1 font-semibold">
                                                                        {item.mediaName}
                                                                    </div>
                                                                    <form.AppField name={`items[${idx}].annotation`}>
                                                                        {(f) =>
                                                                            <Input
                                                                                name={f.name}
                                                                                onBlur={f.handleBlur}
                                                                                value={f.state.value ?? ""}
                                                                                placeholder="Add annotation..."
                                                                                onChange={(ev) => f.handleChange(ev.target.value)}
                                                                            />
                                                                        }
                                                                    </form.AppField>
                                                                </div>
                                                                <Button
                                                                    size="icon"
                                                                    type="button"
                                                                    variant="ghost"
                                                                    onClick={() => void itemsField.removeValue(idx)}
                                                                >
                                                                    <Trash2 className="size-4"/>
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                }
                                            </Field>
                                        );
                                    }}
                                </form.AppField>
                            </div>

                            <div className="col-span-4 space-y-6 max-lg:col-span-12">
                                <div className="space-y-5 rounded-lg border p-4">
                                    <form.AppField name="privacy">
                                        {(field) =>
                                            <Field className="space-y-4">
                                                <FieldLabel className="text-base">Privacy Settings</FieldLabel>
                                                <RadioGroup
                                                    className="space-y-3"
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onValueChange={(value) => field.handleChange(value as PrivacyType)}
                                                >
                                                    {[PrivacyType.PRIVATE, PrivacyType.RESTRICTED, PrivacyType.PUBLIC].map((pt) =>
                                                        <div key={pt} className="flex items-start space-x-3">
                                                            <RadioGroupItem
                                                                id={`${field.name}-${pt}`}
                                                                value={pt} className="mt-1"
                                                            />
                                                            <div className="grid gap-1.5 leading-none">
                                                                <FieldLabel
                                                                    htmlFor={`${field.name}-${pt}`}
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
                                                            </div>
                                                        </div>
                                                    )}
                                                </RadioGroup>
                                            </Field>
                                        }
                                    </form.AppField>

                                    <form.AppField name="ordered">
                                        {(field) =>
                                            <Field orientation="horizontal" className="justify-between rounded-md border px-3 py-2">
                                                <div className="space-y-0.5">
                                                    <FieldLabel htmlFor={field.name} className="text-sm font-semibold">
                                                        Ranked list
                                                    </FieldLabel>
                                                    <FieldDescription className="text-xs">
                                                        Enable drag & drop ranking.
                                                    </FieldDescription>
                                                </div>
                                                <Switch
                                                    id={field.name}
                                                    name={field.name}
                                                    onBlur={field.handleBlur}
                                                    checked={field.state.value}
                                                    onCheckedChange={field.handleChange}
                                                />
                                            </Field>
                                        }
                                    </form.AppField>
                                </div>
                            </div>
                        </div>
                    </form.FormFieldset>
                </form.FormRoot>
            </form.AppForm>
        );
    },
});
