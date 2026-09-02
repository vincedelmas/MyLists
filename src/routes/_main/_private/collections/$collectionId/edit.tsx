import {useForm} from "react-hook-form";
import {PencilLine, Trash2} from "lucide-react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {zodResolver} from "@hookform/resolvers/zod";
import {capitalize} from "@/lib/utils/text-formatting";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {THEME_ICONS_MAP} from "@/lib/utils/theme-utils";
import {Button} from "@/lib/client/components/ui/button";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {formatNumber} from "@/lib/utils/number-formatting";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {collectionDetailsEditOptions} from "@/lib/client/react-query/query-options";
import {CollectionEditor} from "@/lib/client/components/collections/CollectionEditor";
import {collectionIdSchema, CreateCollection, createCollectionSchema} from "@/lib/schemas";
import {useDeleteCollectionMutation, useUpdateCollectionMutation} from "@/lib/client/react-query/query-mutations/collections.mutations";


export const Route = createFileRoute("/_main/_private/collections/$collectionId/edit")({
    params: {
        parse: (params) => {
            const result = collectionIdSchema.safeParse(params);
            return result.success ? result.data : false;
        },
    },
    context: ({ params: { collectionId } }) => ({
        collectionDetailsQueryOptions: collectionDetailsEditOptions(collectionId),
    }),
    loader: ({ context }) => {
        return context.queryClient.ensureQueryData(context.collectionDetailsQueryOptions);
    },
    component: CollectionEditPage,
});


function CollectionEditPage() {
    const confirm = useConfirm();
    const { currentUser } = useAuth();
    const navigate = Route.useNavigate();
    const { collectionId } = Route.useParams();
    const { collectionDetailsQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(collectionDetailsQueryOptions).data;
    const MediaIcon = THEME_ICONS_MAP[apiData.collection.mediaType];
    const updateMutation = useUpdateCollectionMutation(collectionId, { noErrorToast: true });
    const deleteMutation = useDeleteCollectionMutation(collectionId, { noErrorToast: true });
    const form = useForm<CreateCollection>({
        resolver: zodResolver(createCollectionSchema),
        defaultValues: {
            items: apiData.items ?? [],
            title: apiData.collection.title,
            ordered: apiData.collection.ordered,
            privacy: apiData.collection.privacy,
            mediaType: apiData.collection.mediaType,
            description: apiData.collection.description ?? "",
        },
    });

    const handleDelete = async () => {
        if (deleteMutation.isPending) return;
        if (!await confirm({
            variant: "destructive",
            title: "Delete This Collection?",
            confirmLabel: "Delete Collection",
            description: "This collection will be permanently deleted.",
        })) return;

        deleteMutation.mutate({ data: { collectionId } }, {
            onError: (error) => {
                handleServerFormErrors(form, error);
            },
            onSuccess: async () => {
                const redirectUsername = currentUser?.id === apiData.collection.ownerId
                    ? currentUser?.name
                    : apiData.collection.ownerName;

                await navigate({ to: "/collections/user/$username", params: { username: redirectUsername } });
            }
        });
    };

    const handleSubmit = async (payload: CreateCollection) => {
        updateMutation.mutate({ data: { collectionId, ...payload } }, {
            onError: (error) => {
                handleServerFormErrors(form, error);
            },
            onSuccess: () => {
                form.reset(payload);
            }
        });
    };

    return (
        <PageTitle title={`Edit ${apiData.collection.title}`} onlyHelmet>
            <div className="mb-8 flex flex-col pt-8">
                <PageHeader
                    title={`Edit ${apiData.collection.title}`}
                    asideIcon={MediaIcon}
                    eyebrowIcon={PencilLine}
                    eyebrow={`${capitalize(apiData.collection.mediaType)} collection`}
                    asideLabel="In this collection"
                    asideValue={<>{formatNumber(apiData.items.length)} {apiData.items.length === 1 ? "title" : "titles"}</>}
                    description="Change the name, visibility, order or notes for this collection."
                />

                <div className="pt-6">
                    <CollectionEditor
                        form={form}
                        onSubmit={handleSubmit}
                        submitLabel="Save changes"
                        isSubmitting={updateMutation.isPending}
                        mediaType={apiData.collection.mediaType}
                        footerStart={
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={deleteMutation.isPending}
                            >
                                <Trash2 data-icon="inline-start"/>
                                Delete collection
                            </Button>
                        }
                    />
                </div>
            </div>
        </PageTitle>
    );
}
