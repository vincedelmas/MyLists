import {useState} from "react";
import {useForm} from "react-hook-form";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {zodResolver} from "@hookform/resolvers/zod";
import {createFileRoute} from "@tanstack/react-router";
import {MediaType, PrivacyType} from "@/lib/utils/enums";
import {Button} from "@/lib/client/components/ui/button";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {CreateCollection, createCollectionSchema} from "@/lib/schemas";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {CollectionEditor} from "@/lib/client/components/collections/CollectionEditor";
import {useCreateCollectionMutation} from "@/lib/client/react-query/query-mutations/collections.mutations";


export const Route = createFileRoute("/_main/_private/collections/create")({
    component: CollectionCreatePage,
});


function CollectionCreatePage() {
    const { currentUser } = useAuth();
    const navigate = Route.useNavigate();
    const createMutation = useCreateCollectionMutation();
    const [mediaType, setMediaType] = useState<MediaType | null>(null);
    const [step, setStep] = useState<"mediaType" | "editor">("mediaType");
    const activeTypes = currentUser?.settings.filter(s => s.active).map(s => s.mediaType) ?? [];
    const form = useForm<CreateCollection>({
        resolver: zodResolver(createCollectionSchema),
        defaultValues: {
            title: "",
            items: [],
            ordered: false,
            description: "",
            privacy: PrivacyType.PRIVATE,
        },
    });

    const selectMediaType = (mediaType: MediaType) => {
        setMediaType(mediaType);
        setStep("editor");
        form.setValue("mediaType", mediaType);
    };

    const handleSubmit = async (payload: CreateCollection) => {
        createMutation.mutate({ data: payload }, {
            onSuccess: async (newCollection) => {
                form.reset(payload);
                return navigate({ to: "/collections/$collectionId", params: { collectionId: newCollection.id } });
            }
        });
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
                                Collections are made of a single media type.
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
                        onSubmit={handleSubmit}
                        submitLabel="Create Collection"
                        isSubmitting={createMutation.isPending}
                    />
                </div>
            }
        </PageTitle>
    );
}
