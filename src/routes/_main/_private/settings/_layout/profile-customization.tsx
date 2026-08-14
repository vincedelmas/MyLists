import {toast} from "@/lib/client/components/ui/toast";
import {useState} from "react";
import {BookOpenText, Images} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {toItemKey} from "@/lib/utils/media-mapping";
import {zodResolver} from "@hookform/resolvers/zod";
import {FieldSet} from "@/lib/client/components/ui/field";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {highlightedMediaSettingsSchema} from "@/lib/schemas";
import {type FieldErrors, FormProvider, useForm, useWatch} from "react-hook-form";
import {FormError} from "@/lib/client/components/forms/FormError";
import {profileCustomOptions} from "@/lib/client/react-query/query-options";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {TabCustomContent} from "@/lib/client/components/user-settings/TabCustomContent";
import {ProfileSidebarTabs} from "@/lib/client/components/user-settings/ProfileSidebarTabs";
import {BiographySettingsForm} from "@/lib/client/components/user-settings/BiographySettingsForm";
import {useProfileCustomMutation} from "@/lib/client/react-query/query-mutations/user.mutations";
import {HIGHLIGHTED_MEDIA_TABS, HighlightedMediaSearchItem, HighlightedMediaSettings, HighlightedMediaTab,} from "@/lib/types/profile-custom.types";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";


export const Route = createFileRoute("/_main/_private/settings/_layout/profile-customization")({
    loader: ({ context: { queryClient } }) => {
        return queryClient.ensureQueryData(profileCustomOptions);
    },
    component: ProfileCustomization,
});


type ProfileCustomizationSection = "biography" | "highlighted-media";


function ProfileCustomization() {
    const [activeSection, setActiveSection] = useState<ProfileCustomizationSection>("biography");
    const sections = [
        {
            id: "biography",
            label: "Biography",
            description: "Introduce yourself",
            icon: BookOpenText,
        },
        {
            id: "highlighted-media",
            label: "Highlighted Media",
            description: "Showcase your favorites",
            icon: Images,
        },
    ] as const;

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-lg font-semibold text-foreground">Profile Customization</h2>
                <p className="text-sm text-muted-foreground">
                    Choose how you introduce yourself and showcase your media on your profile.
                </p>
            </div>

            <div className="grid grid-cols-[190px_1fr] gap-8 max-lg:grid-cols-1">
                <nav className="space-y-2 max-lg:grid max-lg:grid-cols-2 max-lg:gap-2" aria-label="Profile customization sections">
                    {sections.map(({ id, label, description, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setActiveSection(id)}
                            aria-current={activeSection === id ? "page" : undefined}
                            className={cn(
                                "w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent/40",
                                activeSection === id && "border-brand bg-brand/10",
                            )}
                        >
                            <span className="flex items-center gap-2 text-sm font-medium">
                                <Icon className="size-4"/> {label}
                            </span>
                            <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
                        </button>
                    ))}
                </nav>

                <div className="min-w-0">
                    <div hidden={activeSection !== "biography"}>
                        <BiographySettingsForm/>
                    </div>
                    <div hidden={activeSection !== "highlighted-media"}>
                        <HighlightedMediaForm/>
                    </div>
                </div>
            </div>
        </div>
    );
}


function HighlightedMediaForm() {
    const apiData = useSuspenseQuery(profileCustomOptions).data;
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
            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="flex flex-col gap-6">
                <FieldSet disabled={mutation.isPending}>
                    <div>
                        <h3 className="text-base font-semibold text-foreground">Highlighted Media</h3>
                        <p className="text-sm text-muted-foreground">
                            Configure this block independently for each profile tab.
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
                </FieldSet>
                <FormError/>
                <FormSubmitButton className="w-fit" disabled={!form.formState.isDirty} isLoading={mutation.isPending}>
                    Save Customization
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
