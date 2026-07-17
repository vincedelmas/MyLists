import {toast} from "sonner";
import {useState} from "react";
import {toItemKey} from "@/lib/utils/media-mapping";
import {zodResolver} from "@hookform/resolvers/zod";
import {Form} from "@/lib/client/components/ui/form";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {highlightedMediaSettingsSchema} from "@/lib/schemas";
import {FieldErrors, useForm, useWatch} from "react-hook-form";
import {FormError} from "@/lib/client/components/forms/FormError";
import {handleServerFormErrors} from "@/lib/client/components/forms/forms";
import {profileCustomOptions} from "@/lib/client/react-query/query-options";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {TabCustomContent} from "@/lib/client/components/settings/TabCustomContent";
import {ProfileSidebarTabs} from "@/lib/client/components/settings/ProfileSidebarTabs";
import {useProfileCustomMutation} from "@/lib/client/react-query/query-mutations/user.mutations";
import {HIGHLIGHTED_MEDIA_TABS, HighlightedMediaSearchItem, HighlightedMediaSettings, HighlightedMediaTab,} from "@/lib/types/profile-custom.types";


export const Route = createFileRoute("/_main/_private/settings/_layout/profile-customization")({
    loader: ({ context: { queryClient } }) => {
        return queryClient.ensureQueryData(profileCustomOptions());
    },
    component: ProfileCustomForm,
});


function ProfileCustomForm() {
    const apiData = useSuspenseQuery(profileCustomOptions()).data;
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
                toast.success("Customization updated");
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
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
                <fieldset disabled={mutation.isPending} className="space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold text-primary">
                            Profile Customization
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Configure the Highlighted Media block independently for each profile tab.
                        </p>
                    </div>
                    <div className="grid gap-6 grid-cols-[200px_0.8fr] max-lg:grid-cols-1">
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
                </fieldset>
                <FormError/>
                <FormSubmitButton disabled={!form.formState.isDirty} isLoading={mutation.isPending}>
                    Save Customization
                </FormSubmitButton>
            </form>
        </Form>
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
