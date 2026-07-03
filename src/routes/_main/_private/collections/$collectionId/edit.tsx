import {useAuth} from "@/lib/client/hooks/use-auth";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {useAppForm} from "@/lib/client/components/forms/form";
import {handleFormSubmit} from "@/lib/utils/form-error-handler";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
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
    const { currentUser } = useAuth();
    const navigate = Route.useNavigate();
    const { collectionId } = Route.useParams();
    const updateMutation = useUpdateCollectionMutation(collectionId);
    const deleteMutation = useDeleteCollectionMutation(collectionId);
    const apiData = useSuspenseQuery(collectionDetailsEditOptions(collectionId)).data;
    const form = useAppForm({
        defaultValues: {
            items: apiData.items ?? [],
            title: apiData.collection.title,
            ordered: apiData.collection.ordered,
            privacy: apiData.collection.privacy,
            mediaType: apiData.collection.mediaType,
            description: apiData.collection.description ?? "",
        } as CreateCollection,
        validators: {
            onSubmit: createCollectionSchema,
        },
        onSubmit: async ({ value, formApi }) => {
            const success = await handleFormSubmit(formApi, () => updateMutation.mutateAsync({ data: { collectionId, ...value } }));

            if (success) {
                form.reset(value);
            }
        }
    });

    const handleDelete = async () => {
        if (deleteMutation.isPending) return;
        if (!window.confirm("This collection will be permanently deleted. Are you sure?")) return;

        deleteMutation.mutate({ data: { collectionId } }, {
            onSuccess: async () => {
                const redirectUsername = currentUser?.id === apiData.collection.ownerId
                    ? currentUser?.name
                    : apiData.collection.ownerName;

                await navigate({ to: "/collections/user/$username", params: { username: redirectUsername } });
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
                submitLabel="Update Collection"
                mediaType={apiData.collection.mediaType}
            />
        </PageTitle>
    );
}
