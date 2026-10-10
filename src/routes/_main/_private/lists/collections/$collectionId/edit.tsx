import {useForm, useWatch} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {createFileRoute, Link} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {ArrowLeft, Layers3, Trash2} from "lucide-react";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {handleServerFormErrors} from "@/lib/client/forms";
import {formatNumber} from "@/lib/utils/formatting/number";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {collectionDetailsEditOptions} from "@/lib/client/react-query/query-options";
import {CollectionEditor} from "@/lib/client/components/collections/CollectionEditor";
import {collectionIdSchema, type CreateCollection, createCollectionSchema, collectionNavigationSchema} from "@/lib/schemas";
import {useDeleteCollectionMutation, useUpdateCollectionMutation} from "@/lib/client/react-query/query-mutations/collections.mutations";


export const Route = createFileRoute("/_main/_private/lists/collections/$collectionId/edit")({
    validateSearch: collectionNavigationSchema,
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
        return context.queryClient.fetchQuery({ ...context.collectionDetailsQueryOptions, staleTime: 0 });
    },
    component: CollectionEditPage,
});


function CollectionEditPage() {
    const confirm = useConfirm();
    const navigate = Route.useNavigate();
    const { collectionId } = Route.useParams();
    const { fromCommunity } = Route.useSearch();
    const { collectionDetailsQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(collectionDetailsQueryOptions).data;
    const updateMutation = useUpdateCollectionMutation(collectionId, { noErrorToast: true });
    const deleteMutation = useDeleteCollectionMutation(collectionId, { noErrorToast: true });
    const form = useForm<CreateCollection>({
        resolver: zodResolver(createCollectionSchema),
        defaultValues: {
            items: apiData.items,
            title: apiData.collection.title,
            ordered: apiData.collection.ordered,
            privacy: apiData.collection.privacy,
            description: apiData.collection.description ?? "",
        },
    });

    const items = useWatch({ control: form.control, name: "items" });

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
                await navigate({ to: "/lists/$username", params: { username: apiData.collection.ownerName } });
            }
        });
    };

    const handleSubmit = (payload: CreateCollection) => {
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
                    asideIcon={Layers3}
                    eyebrow={
                        <Link
                            to="/lists/collections/$collectionId"
                            params={{ collectionId }}
                            search={{ fromCommunity }}
                            className="inline-flex items-center gap-2 rounded-sm text-brand outline-none transition-colors hover:text-brand/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                            <ArrowLeft className="size-4" aria-hidden="true"/>
                            View collection
                        </Link>
                    }
                    asideLabel="In this collection"
                    title={`Edit ${apiData.collection.title}`}
                    asideValue={<>{formatNumber(items.length)} media</>}
                    description="Change the name, visibility, order or notes for this collection."
                />

                <div className="pt-6">
                    <CollectionEditor
                        form={form}
                        onSubmit={handleSubmit}
                        submitLabel="Save changes"
                        isSubmitting={updateMutation.isPending || deleteMutation.isPending}
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
