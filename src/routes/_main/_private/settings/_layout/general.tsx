import {useId, useState} from "react";
import {PrivacyType} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {zodResolver} from "@hookform/resolvers/zod";
import {Input} from "@/lib/client/components/ui/input";
import {createFileRoute} from "@tanstack/react-router";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";
import {FormError} from "@/lib/client/components/forms/FormError";
import {Controller, FormProvider, useForm} from "react-hook-form";
import {GeneralSettings, generalSettingsSchema} from "@/lib/schemas";
import {InfoPopover} from "@/lib/client/components/general/InfoPopover";
import {ImageCropper} from "@/lib/client/components/user-settings/ImageCropper";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {useGeneralSettingsMutation} from "@/lib/client/react-query/query-mutations/user.mutations";
import {Field, FieldError, FieldGroup, FieldLabel, FieldSet} from "@/lib/client/components/ui/field";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


export const Route = createFileRoute("/_main/_private/settings/_layout/general")({
    component: GeneralSettingsPage,
});


const privacyItems = [
    { label: "Public", value: PrivacyType.PUBLIC },
    { label: "Restricted", value: PrivacyType.RESTRICTED },
    { label: "Private", value: PrivacyType.PRIVATE },
];


function GeneralSettingsPage() {
    const fieldId = useId();
    const { currentUser, setCurrentUser } = useAuth();
    const [imageCropperResetKey, setImageCropperResetKey] = useState(0);
    const generalSettingsMutation = useGeneralSettingsMutation({ noErrorToast: true });
    const form = useForm<GeneralSettings>({
        resolver: zodResolver(generalSettingsSchema),
        values: {
            username: currentUser?.name ?? "",
            privacy: currentUser?.privacy ?? PrivacyType.RESTRICTED,
        },
    });

    const onSubmit = async (submittedData: GeneralSettings) => {
        const formData = new FormData();

        Object.entries(submittedData).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, value);
            }
        });

        generalSettingsMutation.mutate({ data: formData }, {
            onError: (error) => {
                handleServerFormErrors(form, error);
            },
            onSuccess: async () => {
                await setCurrentUser();
                form.resetField("profileImage");
                form.resetField("backgroundImage");
                setImageCropperResetKey((key) => key + 1);
            },
        });
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex w-full max-w-3xl flex-col gap-6">
                <FieldSet disabled={generalSettingsMutation.isPending}>
                    <div className="grid gap-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                        <FieldGroup>
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">Identity & Access</h3>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    The name users see, and who can access your profile.
                                </p>
                            </div>
                            <Controller
                                name="username"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid} data-disabled={generalSettingsMutation.isPending}>
                                        <FieldLabel htmlFor={`${fieldId}-username`}>
                                            Username
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id={`${fieldId}-username`}
                                            aria-invalid={fieldState.invalid}
                                        />
                                        <FieldError errors={[fieldState.error]}/>
                                    </Field>
                                )}
                            />
                            <Controller
                                name="privacy"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid} data-disabled={generalSettingsMutation.isPending}>
                                        <div className="flex items-center gap-1.5">
                                            <FieldLabel htmlFor={`${fieldId}-privacy`}>
                                                Privacy
                                            </FieldLabel>
                                            <PrivacyPopover/>
                                        </div>
                                        <Select
                                            value={field.value}
                                            items={privacyItems}
                                            onValueChange={(value) => {
                                                if (value !== null) field.onChange(value);
                                            }}
                                        >
                                            <SelectTrigger id={`${fieldId}-privacy`} className="w-full" aria-invalid={fieldState.invalid}>
                                                <SelectValue placeholder="Select a privacy mode"/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    {privacyItems.map((item) =>
                                                        <SelectItem key={item.value} value={item.value}>
                                                            {item.label}
                                                        </SelectItem>
                                                    )}
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                        <FieldError errors={[fieldState.error]}/>
                                    </Field>
                                )}
                            />
                        </FieldGroup>

                        <FieldGroup className="border-t pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">
                                    Profile Personalized Covers
                                </h3>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Personalize your avatar and profile backdrop.
                                </p>
                            </div>
                            <Controller
                                name="profileImage"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid} data-disabled={generalSettingsMutation.isPending}>
                                        <FieldLabel htmlFor={`${fieldId}-pi`}>
                                            Profile image
                                        </FieldLabel>
                                        <ImageCropper
                                            aspect={1}
                                            cropShape="round"
                                            fileName={field.name}
                                            inputId={`${fieldId}-pi`}
                                            onCropApplied={field.onChange}
                                            aria-invalid={fieldState.invalid}
                                            key={`profile-${imageCropperResetKey}`}
                                            resultClassName="h-[150px] rounded-full"
                                        />
                                        <FieldError errors={[fieldState.error]}/>
                                    </Field>
                                )}
                            />
                            <Controller
                                name="backgroundImage"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid} data-disabled={generalSettingsMutation.isPending}>
                                        <FieldLabel htmlFor={`${fieldId}-bi`}>
                                            Background image
                                        </FieldLabel>
                                        <ImageCropper
                                            cropShape="rect"
                                            sliceHeight={256}
                                            fileName={field.name}
                                            inputId={`${fieldId}-bi`}
                                            onCropApplied={field.onChange}
                                            aria-invalid={fieldState.invalid}
                                            key={`background-${imageCropperResetKey}`}
                                            resultClassName="h-16 w-full rounded object-cover"
                                        />
                                        <FieldError errors={[fieldState.error]}/>
                                    </Field>
                                )}
                            />
                        </FieldGroup>
                    </div>
                </FieldSet>
                <FormError/>
                <FormSubmitButton className="w-fit" isLoading={generalSettingsMutation.isPending}>
                    Save changes
                </FormSubmitButton>
            </form>
        </FormProvider>
    );
}


const PrivacyPopover = () => {
    return (
        <InfoPopover
            label="Privacy settings information"
            description="Determine who can see your profile, lists, stats, media updates, etc..."
        >
            <ul className="text-sm list-disc space-y-3 pl-4">
                <li>
                    <span className="font-semibold text-success">Public:</span>
                    {" "}Anyone can see your profile, lists, stats, and media updates.
                </li>
                <li>
                    <span className="font-semibold text-warning">Restricted (default):</span>
                    {" "}Only logged-in users can see your profile, lists, stats, and media updates.
                </li>
                <li>
                    <span className="font-semibold text-destructive">Private:</span>
                    {" "}Only approved followers can see your profile, lists, stats, and media updates.
                </li>
            </ul>
        </InfoPopover>
    );
};
