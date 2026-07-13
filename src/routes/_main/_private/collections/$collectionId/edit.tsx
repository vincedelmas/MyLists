import {useForm} from "react-hook-form";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {zodResolver} from "@hookform/resolvers/zod";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {handleServerFormErrors} from "@/lib/client/components/forms/forms";
import {collectionDetailsEditOptions} from "@/lib/client/react-query/query-options";
import {CollectionEditor} from "@/lib/client/components/collections/CollectionEditor";
import {collectionIdSchema, CreateCollection, createCollectionSchema} from "@/lib/schemas";
import {useDeleteCollectionMutation, useUpdateCollectionMutation} from "@/lib/client/react-query/query-mutations/collections.mutations";


export const Route = createFileRoute("/_main/_private/collections/$collectionId/edit")({
    params: {
        parse: (params) => {
            const result = collectionIdSchema.safeParse(params);
            if (!result.success) return false;
            return result.data;
        },
    },
    loader: async ({ context: { queryClient }, params: { collectionId } }) => {
        return queryClient.ensureQueryData(collectionDetailsEditOptions(collectionId));
    },
    component: CollectionEditPage,
});


function CollectionEditPage() {
    const confirm = useConfirm();
    const { currentUser } = useAuth();
    const navigate = Route.useNavigate();
    const { collectionId } = Route.useParams();
    const apiData = useSuspenseQuery(collectionDetailsEditOptions(collectionId)).data;
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
        <PageTitle title={`Edit - ${apiData.collection.title}`} subtitle="Refine your collection, descriptions, and annotations.">
            <div className="flex items-center justify-start pb-4">
                <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                >
                    Delete Collection
                </Button>
            </div>
            <CollectionEditor
                form={form}
                onSubmit={handleSubmit}
                submitLabel="Update Collection"
                isSubmitting={updateMutation.isPending}
                mediaType={apiData.collection.mediaType}
            />
        </PageTitle>
    );
}
