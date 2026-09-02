import {useState} from "react";
import {toItemKey} from "@/lib/utils/media-mapping";
import {zodResolver} from "@hookform/resolvers/zod";
import {toast} from "@/lib/client/components/ui/toast";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {FieldSet} from "@/lib/client/components/ui/field";
import {highlightedMediaSettingsSchema} from "@/lib/schemas";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";
import {FormError} from "@/lib/client/components/forms/FormError";
import {profileCustomOptions} from "@/lib/client/react-query/query-options";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {type FieldErrors, FormProvider, useForm, useWatch} from "react-hook-form";
import {TabCustomContent} from "@/lib/client/components/user-settings/TabCustomContent";
import {ProfileSidebarTabs} from "@/lib/client/components/user-settings/ProfileSidebarTabs";
import {useProfileCustomMutation} from "@/lib/client/react-query/query-mutations/user.mutations";
import {HIGHLIGHTED_MEDIA_TABS, HighlightedMediaSearchItem, HighlightedMediaSettings, HighlightedMediaTab,} from "@/lib/types/profile-custom.types";


export const Route = createFileRoute("/_main/_private/settings/_layout/profile-customization")({
    context: () => ({ profileCustomQueryOptions: profileCustomOptions }),
    loader: ({ context }) => context.queryClient.ensureQueryData(context.profileCustomQueryOptions),
    component: ProfileCustomForm,
});


function ProfileCustomForm() {
    const { profileCustomQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(profileCustomQueryOptions).data;
    const mutation = useProfileCustomMutation({ noErrorToast: true });
    const [activeTab, setActiveTab] = useState<HighlightedMediaTab>("overview");
    const [localPreviewCache, setLocalPreviewCache] = useState<Record<string, HighlightedMediaSearchItem>>({});
    const form = useForm<HighlightedMediaSettings, unknown, HighlightedMediaSettings>({
        resolver: zodResolver<HighlightedMediaSettings, unknown, HighlightedMediaSettings>(highlightedMediaSettingsSchema),
        values: cloneSettings(apiData.settings),
    });

    const allFormValues = useWatch({ control: form.control });
    const combinedPreviewCache = { ...buildPreviewCache(apiData.previews), ...localPreviewCache };

    const onSubmit = (formData: HighlightedMediaSettings) => {
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

    const onInvalid = (errors: FieldErrors<HighlightedMediaSettings>) => {
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

                        <TabCustomContent
                            key={activeTab}
                            activeTab={activeTab}
                            previewCache={combinedPreviewCache}
                            setPreviewCache={setLocalPreviewCache}
                        />
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


const cloneSettings = (settings: HighlightedMediaSettings) => {
    return JSON.parse(JSON.stringify(settings)) as HighlightedMediaSettings;
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
