import {ArrowLeft, Layers3} from "lucide-react";
import {useForm, useWatch} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {useSuspenseQuery} from "@tanstack/react-query";
import {handleServerFormErrors} from "@/lib/client/forms";
import {formatNumber} from "@/lib/utils/formatting/number";
import {createFileRoute, Link, useRouter} from "@tanstack/react-router";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {collectionDetailsEditOptions} from "@/lib/client/react-query/query-options";
import {CollectionEditor} from "@/lib/client/components/collections/CollectionEditor";
import {useUpdateCollectionMutation} from "@/lib/client/react-query/query-mutations/collections.mutations";
import {collectionIdSchema, type CreateCollection, createCollectionSchema, collectionNavigationSchema} from "@/lib/schemas";


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
        return context.queryClient.query({ ...context.collectionDetailsQueryOptions, staleTime: 0 });
    },
    component: CollectionEditPage,
    head: ({ loaderData }) => ({
        meta: loaderData ? [{ title: `Edit ${loaderData.collection.title} - MyLists` }] : [],
    }),
});


function CollectionEditPage() {
    const router = useRouter();
    const navigate = Route.useNavigate();
    const { collectionId } = Route.useParams();
    const { fromCommunity } = Route.useSearch();
    const { collectionDetailsQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(collectionDetailsQueryOptions).data;
    const updateMutation = useUpdateCollectionMutation(collectionId, { noErrorToast: true });
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

    const handleSubmit = (payload: CreateCollection) => {
        updateMutation.mutate({ data: { collectionId, ...payload } }, {
            onError: (error) => {
                handleServerFormErrors(form, error);
            },
            onSuccess: async () => {
                form.reset(payload);
                await router.invalidate();
            }
        });
    };

    return (
        <div className="mb-8 flex flex-col pt-8">
            <PageHeader
                asideIcon={Layers3}
                asideLabel="In this collection"
                title={`Edit ${apiData.collection.title}`}
                asideValue={<>{formatNumber(items.length)} media</>}
                description="Change the name, visibility, order or notes for this collection."
                eyebrow={
                    <Link
                        params={{ collectionId }}
                        search={{ fromCommunity }}
                        to="/lists/collections/$collectionId"
                        className="inline-flex items-center gap-2 rounded-sm text-brand outline-none transition-colors
                        hover:text-brand/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                        focus-visible:ring-offset-background"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true"/>
                        View collection
                    </Link>
                }
            />

            <div className="pt-6">
                <CollectionEditor
                    form={form}
                    onSubmit={handleSubmit}
                    submitLabel="Save changes"
                    isSubmitting={updateMutation.isPending}
                    onCancel={() => void navigate({
                        params: { collectionId },
                        search: { fromCommunity },
                        to: "/lists/collections/$collectionId",
                    })}
                />
            </div>
        </div>
    );
}
