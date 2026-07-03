import {useState} from "react";
import {MediaType} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {createCollectionSchema} from "@/lib/schemas";
import {createFileRoute} from "@tanstack/react-router";
import {Button} from "@/lib/client/components/ui/button";
import {useAppForm} from "@/lib/client/components/forms/form";
import {handleFormSubmit} from "@/lib/utils/form-error-handler";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {useCreateCollectionMutation} from "@/lib/client/react-query/query-mutations/collections.mutations";
import {collectionDefaultValues, CollectionEditor} from "@/lib/client/components/collections/CollectionEditor";


export const Route = createFileRoute("/_main/_private/collections/create")({
    component: CollectionCreatePage,
});


function CollectionCreatePage() {
    const { currentUser } = useAuth();
    const navigate = Route.useNavigate();
    const createMutation = useCreateCollectionMutation({ noErrorToast: true });
    const [mediaType, setMediaType] = useState<MediaType | null>(null);
    const [step, setStep] = useState<"mediaType" | "editor">("mediaType");
    const activeTypes = currentUser?.settings.filter(s => s.active).map(s => s.mediaType) ?? [];
    const form = useAppForm({
        defaultValues: collectionDefaultValues,
        validators: {
            onSubmit: createCollectionSchema,
        },
        onSubmit: async ({ value, formApi }) => {
            let newCollectionId: number | undefined;
            const success = await handleFormSubmit(formApi, async () => {
                const newCollection = await createMutation.mutateAsync({ data: value });
                newCollectionId = newCollection.id;
            });

            if (!success || newCollectionId === undefined) return;

            form.reset(value);
            await navigate({ to: "/collections/$collectionId", params: { collectionId: newCollectionId } });
        }
    });

    const selectMediaType = (selectedMediaType: MediaType) => {
        const isMediaTypeChange = mediaType !== null && mediaType !== selectedMediaType;
        if (isMediaTypeChange) {
            form.clearFieldValues("items");
        }

        setStep("editor");
        setMediaType(selectedMediaType);
        form.setFieldValue("mediaType", selectedMediaType, { dontUpdateMeta: !isMediaTypeChange });
    };

    return (
        <PageTitle title="Create a Collection" subtitle="Build a curated list with notes and ranking.">
            {step === "mediaType" &&
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="font-semibold">
                                1. Choose a media type
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Collections are made of a single media type. Changing it clears the current items.
                            </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                            Step 1 of 2
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {activeTypes.map((mt) =>
                            <Button key={mt} variant="outline" className="capitalize" onClick={() => selectMediaType(mt)}>
                                <MainThemeIcon type={mt}/> {mt}
                            </Button>
                        )}
                    </div>
                </div>
            }

            {(step === "editor" && mediaType) &&
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <Button variant="outline" onClick={() => setStep("mediaType")}>
                                Change Media Type
                            </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Step 2 of 2
                        </div>
                    </div>
                    <CollectionEditor
                        form={form}
                        mediaType={mediaType}
                        submitLabel="Create Collection"
                    />
                </div>
            }
        </PageTitle>
    );
}
