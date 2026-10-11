import {type ReactNode, useId} from "react";
import {PrivacyType} from "@/lib/utils/enums";
import type {CreateCollection} from "@/lib/schemas";
import {Input} from "@/lib/client/components/ui/input";
import {Switch} from "@/lib/client/components/ui/switch";
import {Textarea} from "@/lib/client/components/ui/textarea";
import {FormError} from "@/lib/client/components/forms/FormError";
import {PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {useConfirmBlocker} from "@/lib/client/hooks/use-confirm-blocker";
import {Controller, FormProvider, type UseFormReturn} from "react-hook-form";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {RadioGroup, RadioGroupItem} from "@/lib/client/components/ui/radio-group";
import {Card, CardContent, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {CollectionItemsEditor} from "@/lib/client/components/collections/CollectionItemsEditor";
import {Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "@/lib/client/components/ui/field";


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

    useConfirmBlocker({
        cancelLabel: "Stay",
        confirmLabel: "Leave",
        variant: "destructive",
        title: "Leave without saving?",
        when: isDirty && !isSubmitting,
        description: "Your collection edits will be lost if you leave this page.",
    });

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

                            <CollectionItemsEditor
                                disabled={isSubmitting}
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
