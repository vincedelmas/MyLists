import {PrivacyType} from "@/lib/utils/enums";
import {Layers3} from "lucide-react";
import {useForm, useWatch} from "react-hook-form";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {zodResolver} from "@hookform/resolvers/zod";
import {createFileRoute} from "@tanstack/react-router";
import {handleServerFormErrors} from "@/lib/client/forms";
import {formatNumber} from "@/lib/utils/formatting/number";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {ListsBackLink} from "@/lib/client/components/lists/ListsBackLink";
import {type CreateCollection, createCollectionSchema} from "@/lib/schemas";
import {CollectionEditor} from "@/lib/client/components/collections/CollectionEditor";
import {useCreateCollectionMutation} from "@/lib/client/react-query/query-mutations/collections.mutations";


export const Route = createFileRoute("/_main/_private/lists/collections/create")({
    component: CollectionCreatePage,
});


function CollectionCreatePage() {
    const navigate = Route.useNavigate();
    const { currentUser } = useAuth();
    const createMutation = useCreateCollectionMutation({ noErrorToast: true });
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

    const items = useWatch({ control: form.control, name: "items" });

    const handleSubmit = (payload: CreateCollection) => {
        createMutation.mutate({ data: payload }, {
            onError: error => handleServerFormErrors(form, error),
            onSuccess: async newCollection => {
                form.reset(payload);
                return navigate({ to: "/lists/collections/$collectionId", params: { collectionId: newCollection.id } });
            },
        });
    };

    return (
        <PageTitle title="Create a collection" onlyHelmet>
            <div className="mb-8 flex flex-col pt-8">
                <PageHeader
                    asideIcon={Layers3}
                    eyebrow={<ListsBackLink username={currentUser!.name}/>}
                    title="Create a collection"
                    asideLabel="In this collection"
                    asideValue={<>{formatNumber(items.length)} media</>}
                    description="Bring your favorites together, from a movie marathon to a universe spanning books, games and more."
                />

                <div className="pt-6">
                    <CollectionEditor
                        form={form}
                        onSubmit={handleSubmit}
                        submitLabel="Create collection"
                        isSubmitting={createMutation.isPending}
                    />
                </div>
            </div>
        </PageTitle>
    );
}
