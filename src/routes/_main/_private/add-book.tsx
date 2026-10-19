import * as z from "zod";
import {MediaType} from "@/lib/utils/enums";
import {Library, PencilLine} from "lucide-react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {createFileRoute} from "@tanstack/react-router";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {resolveMediaTypeActive} from "@/lib/utils/media/list-activation";
import {BooksManualEntryForm} from "@/lib/client/components/media/books/BooksManualEntryForm";
import {DisabledMediaListNotice} from "@/lib/client/components/media/base/DisabledMediaListNotice";


export const Route = createFileRoute("/_main/_private/add-book")({
    validateSearch: z.object({ title: z.string().optional() }),
    component: AddBookPage,
    head: () => ({
        meta: [{ title: "Add a book - MyLists" }],
    }),
});


function AddBookPage() {
    const { currentUser } = useAuth();
    const { title } = Route.useSearch();

    return (
        <div className="mb-8 flex flex-col gap-6 pt-8">
            <PageHeader
                asideValue="Books"
                title="Add a book"
                asideIcon={Library}
                eyebrowIcon={PencilLine}
                asideLabel="Manual entry"
                eyebrow="Your missing book"
                description="Can’t find a book on Google Books? Enter its details to add it to your reading list."
            />

            {resolveMediaTypeActive(currentUser?.settings, MediaType.BOOKS) ?
                <BooksManualEntryForm
                    initialTitle={title}
                />
                :
                <DisabledMediaListNotice
                    mediaType={MediaType.BOOKS}
                />
            }
        </div>
    );
}
