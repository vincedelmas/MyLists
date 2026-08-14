import {toast} from "@/lib/client/components/ui/toast";
import {zodResolver} from "@hookform/resolvers/zod";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Controller, FormProvider, useForm, useWatch} from "react-hook-form";
import {Textarea} from "@/lib/client/components/ui/textarea";
import {Field, FieldDescription, FieldError, FieldLabel, FieldSet} from "@/lib/client/components/ui/field";
import {FormError} from "@/lib/client/components/forms/FormError";
import {BiographySettings, biographySettingsSchema} from "@/lib/schemas";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";
import {PROFILE_BIOGRAPHY_MAX_LENGTH} from "@/lib/types/profile-custom.types";
import {profileCustomOptions} from "@/lib/client/react-query/query-options";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {MarkdownContent} from "@/lib/client/components/general/MarkdownContent";
import {useBiographyMutation} from "@/lib/client/react-query/query-mutations/user.mutations";


export const BiographySettingsForm = () => {
    const apiData = useSuspenseQuery(profileCustomOptions).data;
    const mutation = useBiographyMutation({ noErrorToast: true });
    const form = useForm<BiographySettings, unknown, BiographySettings>({
        resolver: zodResolver<BiographySettings, unknown, BiographySettings>(biographySettingsSchema),
        values: { biography: apiData.biography ?? "" },
    });
    const biography = useWatch({ control: form.control, name: "biography" });

    const onSubmit = (formData: BiographySettings) => {
        mutation.mutate({ data: formData }, {
            onError: (error) => handleServerFormErrors(form, error),
            onSuccess: (savedBiography) => {
                form.reset({ biography: savedBiography ?? "" });
                toast.add({ title: savedBiography ? "Biography updated" : "Biography removed", type: "success" });
            },
        });
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
                <FieldSet disabled={mutation.isPending}>
                    <div>
                        <h3 className="text-base font-semibold text-foreground">Biography</h3>
                        <p className="text-sm text-muted-foreground">
                            Introduce yourself on your profile. Leave this empty to hide the section completely.
                        </p>
                    </div>

                    <Controller
                        name="biography"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid} data-disabled={mutation.isPending}>
                                <FieldLabel htmlFor="profile-biography">About you</FieldLabel>
                                <FieldDescription>
                                    GitHub Flavored Markdown is supported, including links, images, tables, task lists, and strikethrough.
                                </FieldDescription>
                                <Textarea
                                    {...field}
                                    id="profile-biography"
                                    className="min-h-64 resize-y font-mono"
                                    aria-invalid={fieldState.invalid}
                                    maxLength={PROFILE_BIOGRAPHY_MAX_LENGTH}
                                    placeholder={"Share a little about yourself...\n\nYou can add an image with: ![Description](https://example.com/image.jpg)"}
                                />
                                <div className="flex items-start justify-between gap-4">
                                    <FieldError errors={[fieldState.error]}/>
                                    <span className="ml-auto text-xs text-muted-foreground">
                                        {biography.length} / {PROFILE_BIOGRAPHY_MAX_LENGTH}
                                    </span>
                                </div>
                            </Field>
                        )}
                    />

                    <div>
                        <h4 className="mb-2 text-sm font-medium">Preview</h4>
                        <div className="min-h-24 rounded-xl border bg-card px-5 py-4">
                            {biography.trim() ?
                                <MarkdownContent>{biography}</MarkdownContent>
                                :
                                <p className="text-sm text-muted-foreground">Your biography preview will appear here.</p>
                            }
                        </div>
                    </div>
                </FieldSet>
                <FormError/>
                <FormSubmitButton className="w-fit" disabled={!form.formState.isDirty} isLoading={mutation.isPending}>
                    Save Biography
                </FormSubmitButton>
            </form>
        </FormProvider>
    );
};
