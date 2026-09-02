import {useState} from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {createFileRoute} from "@tanstack/react-router";
import {Button} from "@/lib/client/components/ui/button";
import {MediaType, PrivacyType} from "@/lib/utils/enums";
import {ALL_MEDIA_TYPES} from "@/lib/utils/media-mapping";
import {THEME_ICONS_MAP} from "@/lib/utils/theme-utils";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {CreateCollection, createCollectionSchema} from "@/lib/schemas";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {ArrowLeft, Layers3, ListPlus} from "lucide-react";
import {CollectionEditor} from "@/lib/client/components/collections/CollectionEditor";
import {useCreateCollectionMutation} from "@/lib/client/react-query/query-mutations/collections.mutations";


export const Route = createFileRoute("/_main/_private/collections/create")({
    component: CollectionCreatePage,
});


function CollectionCreatePage() {
    const navigate = Route.useNavigate();
    const createMutation = useCreateCollectionMutation({ noErrorToast: true });
    const [mediaType, setMediaType] = useState<MediaType | null>(null);
    const [step, setStep] = useState<"mediaType" | "editor">("mediaType");
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
            onError: (error) => {
                handleServerFormErrors(form, error);
            },
            onSuccess: async (newCollection) => {
                form.reset(payload);
                return navigate({ to: "/collections/$collectionId", params: { collectionId: newCollection.id } });
            }
        });
    };

    const StepIcon = mediaType ? THEME_ICONS_MAP[mediaType] : Layers3;
    const stepNumber = step === "mediaType" ? 1 : 2;

    return (
        <PageTitle title="Create a collection" onlyHelmet>
            <div className="mb-8 flex flex-col pt-6">
                <PageHeader
                    asideIcon={StepIcon}
                    asideLabel="Two quick steps"
                    eyebrowIcon={ListPlus}
                    title="Create a collection"
                    eyebrow="New collection"
                    asideValue={<>Step {stepNumber} of 2</>}
                    description="Choose one media type, then add and organize the titles you want to keep together."
                />

                {step === "mediaType" &&
                    <section className="pt-7">
                        <h2 className="text-lg font-semibold tracking-tight text-foreground">
                            Choose a media type
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            A collection can contain titles from one media type.
                        </p>
                        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
                            {ALL_MEDIA_TYPES.map((mt) =>
                                <Button
                                    key={mt}
                                    variant="outline"
                                    onClick={() => selectMediaType(mt)}
                                    className="h-14 justify-start gap-3 px-4 text-base capitalize"
                                >
                                    <MainThemeIcon type={mt}/>
                                    {mt}
                                </Button>
                            )}
                        </div>
                    </section>
                }

                {(step === "editor" && mediaType) &&
                    <section>
                        <div className="flex items-center justify-between gap-4 py-5">
                            <div className="flex items-center gap-2 text-sm font-medium capitalize text-foreground">
                                <MainThemeIcon type={mediaType}/>
                                {mediaType} collection
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setStep("mediaType")}>
                                <ArrowLeft data-icon="inline-start"/>
                                Change type
                            </Button>
                        </div>
                        <CollectionEditor
                            form={form}
                            mediaType={mediaType}
                            onSubmit={handleSubmit}
                            submitLabel="Create collection"
                            isSubmitting={createMutation.isPending}
                        />
                    </section>
                }
            </div>
        </PageTitle>
    );
}
