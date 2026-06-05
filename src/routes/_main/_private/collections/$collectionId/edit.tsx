import {useForm} from "react-hook-form";
import {CreateCollection} from "@/lib/schemas";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {FormZodError} from "@/lib/utils/error-classes";
import {Button} from "@/lib/client/components/ui/button";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {CollectionEditor} from "@/lib/client/components/collections/CollectionEditor";
import {collectionDetailsEditOptions} from "@/lib/client/react-query/query-options";
import {useDeleteCollectionMutation, useUpdateCollectionMutation} from "@/lib/client/react-query/query-mutations/collections.mutations";


export const Route = createFileRoute("/_main/_private/collections/$collectionId/edit")({
    params: {
        parse: (params) => {
            return { collectionId: Number(params.collectionId) }
        }
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
    const form = useForm<CreateCollection>({
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
        if (!window.confirm("This collection will be permanently deleted. Are you sure?")) return;

        deleteMutation.mutate({ data: { collectionId } }, {
            onSuccess: async () => {
                const redirectUsername = currentUser?.id === apiData.collection.ownerId
                    ? currentUser?.name : apiData.collection.ownerName;
                return navigate({ to: "/collections/user/$username", params: { username: redirectUsername } });
            }
        });
    };

    const handleSubmit = async (payload: CreateCollection) => {
        updateMutation.mutate({ data: { collectionId, ...payload } }, {
            onError: (err) => {
                if (err instanceof FormZodError) {
                    err.issues.forEach((issue) => {
                        const fieldPath = issue.path[0] === "items" ? "items" : issue.path.join(".");
                        form.setError(fieldPath, { message: issue.message });
                    });
                }
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
