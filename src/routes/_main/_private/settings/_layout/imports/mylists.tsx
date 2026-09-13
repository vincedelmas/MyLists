import {ImportSource} from "@/lib/utils/enums";
import {createFileRoute} from "@tanstack/react-router";
import {ImportUploadForm} from "@/lib/client/components/imports/ImportUploadForm";
import {ImportInstructions, ImportPageLayout} from "@/lib/client/components/imports/ImportPageLayout";


export const Route = createFileRoute("/_main/_private/settings/_layout/imports/mylists")({
    component: MyListsImportPage,
});


function MyListsImportPage() {
    return (
        <ImportPageLayout
            description="Upload a MyLists CSV export to add media to your lists.
            Older exports are not supported, please re-export your list from Content & Lists."
        >
            <ImportInstructions>
                <li>Export your list from the Content & Lists settings page.</li>
                <li>Upload the generated MyLists CSV here.</li>
            </ImportInstructions>

            <ImportUploadForm
                defaultValues={{ source: ImportSource.MYLISTS }}
            />
        </ImportPageLayout>
    );
}
