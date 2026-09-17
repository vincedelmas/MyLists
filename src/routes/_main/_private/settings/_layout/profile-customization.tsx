import {useId, useState} from "react";
import {toItemKey} from "@/lib/utils/media/item-key";
import {zodResolver} from "@hookform/resolvers/zod";
import {toast} from "@/lib/client/components/ui/toast";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Switch} from "@/lib/client/components/ui/switch";
import {handleServerFormErrors} from "@/lib/client/forms";
import {profileCustomizationSettingsSchema} from "@/lib/schemas";
import {FormError} from "@/lib/client/components/forms/FormError";
import {profileCustomOptions} from "@/lib/client/react-query/query-options";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {TabCustomContent} from "@/lib/client/components/user-settings/TabCustomContent";
import {Card, CardContent, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {ProfileSidebarTabs} from "@/lib/client/components/user-settings/ProfileSidebarTabs";
import {Controller, type FieldErrors, FormProvider, useForm, useWatch} from "react-hook-form";
import {useProfileCustomMutation} from "@/lib/client/react-query/query-mutations/user.mutations";
import {Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSet} from "@/lib/client/components/ui/field";
import {HIGHLIGHTED_MEDIA_TABS, HighlightedMediaSearchItem, HighlightedMediaTab, ProfileCustomizationSettings} from "@/lib/types/profile-custom.types";


export const Route = createFileRoute("/_main/_private/settings/_layout/profile-customization")({
    context: () => ({ profileCustomQueryOptions: profileCustomOptions }),
    loader: ({ context }) => context.queryClient.ensureQueryData(context.profileCustomQueryOptions),
    component: ProfileCustomForm,
});


function ProfileCustomForm() {
    const fieldId = useId();
    const { profileCustomQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(profileCustomQueryOptions).data;
    const mutation = useProfileCustomMutation({ noErrorToast: true });
    const [activeTab, setActiveTab] = useState<HighlightedMediaTab>("overview");
    const [localPreviewCache, setLocalPreviewCache] = useState<Record<string, HighlightedMediaSearchItem>>({});
    const form = useForm<ProfileCustomizationSettings, unknown, ProfileCustomizationSettings>({
        resolver: zodResolver<ProfileCustomizationSettings, unknown, ProfileCustomizationSettings>(profileCustomizationSettingsSchema),
        values: cloneSettings(apiData.settings),
    });

    const allFormValues = useWatch({ control: form.control });
    const combinedPreviewCache = { ...buildPreviewCache(apiData.previews), ...localPreviewCache };

    const onSubmit = (formData: ProfileCustomizationSettings) => {
        mutation.mutate({ data: formData }, {
            onError: (error) => {
                handleServerFormErrors(form, error);
            },
            onSuccess: () => {
                setLocalPreviewCache({});
                toast.add({ title: "Customization updated", type: "success" });
            },
        });
    };

    const onInvalid = (errors: FieldErrors<ProfileCustomizationSettings>) => {
        const invalidTab = HIGHLIGHTED_MEDIA_TABS.find((tab) => errors[tab]);
        if (invalidTab) {
            setActiveTab(invalidTab);
        }
        form.setError("root", {
            message: getFirstErrorMessage(errors) ?? "Customization could not be saved.",
        });
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="flex flex-col gap-8">
                <FieldSet disabled={mutation.isPending}>
                    <div className="grid items-start gap-8 lg:grid-cols-[12rem_minmax(0,1fr)]">
                        <ProfileSidebarTabs
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            allFormValues={allFormValues}
                        />

                        <div className="flex flex-col gap-6">
                            {activeTab === "overview" &&
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Continue preview</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <FieldGroup>
                                            <Controller
                                                name="showContinue"
                                                control={form.control}
                                                render={({ field, fieldState }) =>
                                                    <Field orientation="horizontal" data-invalid={fieldState.invalid} data-disabled={mutation.isPending}>
                                                        <FieldContent>
                                                            <FieldLabel htmlFor={`${fieldId}-continue`}>
                                                                Show Continue on my profile
                                                            </FieldLabel>
                                                            <FieldDescription id={`${fieldId}-continue-description`}>
                                                                Show your current media in your profile overview, for you and your visitors.
                                                                Continue is always available from MyMedia.
                                                            </FieldDescription>
                                                            <FieldError errors={[fieldState.error]}/>
                                                        </FieldContent>
                                                        <Switch
                                                            ref={field.ref}
                                                            name={field.name}
                                                            checked={field.value}
                                                            onBlur={field.onBlur}
                                                            id={`${fieldId}-continue`}
                                                            disabled={mutation.isPending}
                                                            onCheckedChange={field.onChange}
                                                            aria-invalid={fieldState.invalid}
                                                            aria-describedby={`${fieldId}-continue-description`}
                                                        />
                                                    </Field>
                                                }
                                            />
                                        </FieldGroup>
                                    </CardContent>
                                </Card>
                            }
                            <TabCustomContent
                                key={activeTab}
                                activeTab={activeTab}
                                previewCache={combinedPreviewCache}
                                setPreviewCache={setLocalPreviewCache}
                            />
                        </div>
                    </div>
                </FieldSet>
                <FormError/>
                <FormSubmitButton className="self-end" disabled={!form.formState.isDirty} isLoading={mutation.isPending}>
                    Save changes
                </FormSubmitButton>
            </form>
        </FormProvider>
    );
}


const cloneSettings = (settings: ProfileCustomizationSettings) => {
    return JSON.parse(JSON.stringify(settings)) as ProfileCustomizationSettings;
};


const buildPreviewCache = (previews: Record<string, { items: HighlightedMediaSearchItem[] }>) => {
    return Object.values(previews).reduce<Record<string, HighlightedMediaSearchItem>>(
        (acc, tabPreview) => {
            tabPreview.items.forEach((item) => {
                acc[toItemKey(item)] = item;
            });
            return acc;
        }, {});
};


const getFirstErrorMessage = (error: unknown): string | undefined => {
    if (!error || typeof error !== "object") {
        return undefined;
    }

    if ("message" in error && typeof error.message === "string") {
        return error.message;
    }

    for (const value of Object.values(error)) {
        const message = getFirstErrorMessage(value);
        if (message) {
            return message;
        }
    }
};
