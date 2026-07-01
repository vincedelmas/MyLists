import {toast} from "sonner";
import {useState} from "react";
import {CircleHelp} from "lucide-react";
import {PrivacyType} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {createFileRoute} from "@tanstack/react-router";
import {ValidationError} from "@/lib/utils/error-classes";
import {useAppForm} from "@/lib/client/components/forms/form";
import {GeneralSettings, generalSettingsSchema} from "@/lib/schemas";
import {ImageCropper} from "@/lib/client/components/user-settings/ImageCropper";
import {Popover, PopoverContent, PopoverTrigger} from "@/lib/client/components/ui/popover";
import {Field, FieldError, FieldGroup, FieldLabel} from "@/lib/client/components/ui/field";
import {useGeneralSettingsMutation} from "@/lib/client/react-query/query-mutations/user.mutations";


export const Route = createFileRoute("/_main/_private/settings/_layout/general")({
    component: GeneralSettingsPage,
});


function GeneralSettingsPage() {
    const { currentUser, setCurrentUser } = useAuth();
    const generalSettingsMutation = useGeneralSettingsMutation();
    const [imageCropperResetKey, setImageCropperResetKey] = useState(0);
    const form = useAppForm({
        defaultValues: {
            username: currentUser?.name ?? "",
            privacy: currentUser?.privacy ?? PrivacyType.RESTRICTED,
        } as GeneralSettings,
        validators: {
            onSubmit: generalSettingsSchema,
            onSubmitAsync: async ({ value }) => {
                const formData = new FormData();
                Object.entries(value).forEach(([key, fieldValue]) => {
                    if (fieldValue !== undefined && fieldValue !== null) {
                        formData.append(key, fieldValue);
                    }
                });

                try {
                    await generalSettingsMutation.mutateAsync({ data: formData });
                }
                catch (err) {
                    if (err instanceof ValidationError) {
                        return {
                            fields: {
                                [err.field]: err.message,
                            }
                        }
                    }
                }
            },
        },
        onSubmit: async ({ value }) => {
            await setCurrentUser();
            setImageCropperResetKey((key) => key + 1);
            toast.success("Settings Updated Successfully!");
            form.reset({ privacy: value.privacy, username: value.username });
        },
    });

    return (
        <form.AppForm>
            <form.FormRoot className="w-90 max-sm:w-full">
                <form.FormFieldset>
                    <FieldGroup className="gap-6">
                        <form.AppField name="username">
                            {(field) =>
                                <field.TextField
                                    label="Username"
                                    autoComplete="username"
                                />
                            }
                        </form.AppField>
                        <form.AppField name="privacy">
                            {(field) =>
                                <field.SelectField
                                    label="Privacy"
                                    labelAccessory={<PrivacyPopover/>}
                                    placeholder="Select a privacy mode"
                                    options={[
                                        { value: PrivacyType.PUBLIC, label: "Public" },
                                        { value: PrivacyType.RESTRICTED, label: "Restricted" },
                                        { value: PrivacyType.PRIVATE, label: "Private" },
                                    ]}
                                />
                            }
                        </form.AppField>
                        <form.AppField name="profileImage">
                            {(field) => {
                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={`${field.name}-input`}>Profile image</FieldLabel>
                                        <ImageCropper
                                            aspect={1}
                                            cropShape="round"
                                            fileName={field.name}
                                            onCropApplied={field.handleChange}
                                            key={`profile-${imageCropperResetKey}`}
                                            resultClassName="h-[150px] rounded-full"
                                        />
                                        {isInvalid && <FieldError errors={field.state.meta.errors}/>}
                                    </Field>
                                );
                            }}
                        </form.AppField>
                        <form.AppField name="backgroundImage">
                            {(field) => {
                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={`${field.name}-input`}>Background Image</FieldLabel>
                                        <ImageCropper
                                            cropShape="rect"
                                            sliceHeight={256}
                                            fileName={field.name}
                                            onCropApplied={field.handleChange}
                                            key={`background-${imageCropperResetKey}`}
                                            resultClassName="w-full h-16 object-cover rounded"
                                        />
                                        {isInvalid && <FieldError errors={field.state.meta.errors}/>}
                                    </Field>
                                );
                            }}
                        </form.AppField>
                    </FieldGroup>
                </form.FormFieldset>
                <form.SubmitButton
                    className="mt-6"
                    requireDirty={true}
                    label="Update Settings"
                />
            </form.FormRoot>
        </form.AppForm>
    );
}


const PrivacyPopover = () => {
    return (
        <Popover>
            <PopoverTrigger type="button" className="opacity-50 hover:opacity-80">
                <CircleHelp className="w-4 h-4"/>
            </PopoverTrigger>
            <PopoverContent className="p-5 w-80">
                <div className="mb-3 text-sm font-medium text-muted-foreground">
                    Determine who can see your profile, lists, stats, media updates, etc...
                </div>
                <ul className="text-sm list-disc space-y-3 pl-4">
                    <li>
                        <span className="font-semibold text-green-500">Public:</span>
                        {" "}Anyone can see your profile, lists, stats, and media updates.
                    </li>
                    <li>
                        <span className="font-semibold text-amber-500">Restricted (default):</span>
                        {" "}Only logged-in users can see your profile, lists, stats, and media updates.
                    </li>
                    <li>
                        <span className="font-semibold text-red-500">Private:</span>
                        {" "}Only approved followers can see your profile, lists, stats, and media updates.
                    </li>
                </ul>
            </PopoverContent>
        </Popover>
    );
};
