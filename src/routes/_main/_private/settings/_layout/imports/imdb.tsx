import {AlertTriangle} from "lucide-react";
import {ImportSource} from "@/lib/utils/enums";
import {createFileRoute} from "@tanstack/react-router";
import {imdbCsvTypeSchema} from "@/lib/schemas/imports.schema";
import {ImportUploadForm} from "@/lib/client/components/imports/ImportUploadForm";
import {Alert, AlertDescription, AlertTitle} from "@/lib/client/components/ui/alert";
import {ImportFileTypeField} from "@/lib/client/components/imports/ImportFileTypeField";
import {ImportInstructions, ImportPageLayout} from "@/lib/client/components/imports/ImportPageLayout";


export const Route = createFileRoute("/_main/_private/settings/_layout/imports/imdb")({
    component: ImdbImportPage,
});


function ImdbImportPage() {
    return (
        <ImportPageLayout description="Upload your IMDb ratings or watchlist to your Movies list.">
            <Alert variant="warning">
                <AlertTriangle/>
                <AlertTitle>Important: import ratings first, then watchlist</AlertTitle>
                <AlertDescription>
                    <ul className="flex list-disc flex-col gap-1.5 pl-4">
                        <li>Movies are supported. Other title types are skipped.</li>
                        <li>Existing movies are never updated !</li>
                        <li>Reviews, custom lists, and watch history are not imported.</li>
                        <li>Wait for each import to finish and review the row issues before uploading the next file.</li>
                        <li>Importing your watchlist first means a later ratings import will not add ratings or mark those movies as Completed.</li>
                    </ul>
                </AlertDescription>
            </Alert>

            <ImportInstructions>
                <li>On the IMDb website, open Your Ratings or Your Watchlist from your profile menu and choose Export. Download the CSV.</li>
                <li>Select the matching file type below. Upload your ratings CSV first, then your watchlist CSV.</li>
            </ImportInstructions>

            <ImportUploadForm defaultValues={{ source: ImportSource.IMDB, imdbFileType: "ratings" }}>
                {({ control, isSubmitting }) => (
                    <ImportFileTypeField
                        control={control}
                        name="imdbFileType"
                        label="IMDb CSV file type"
                        isSubmitting={isSubmitting}
                        options={imdbCsvTypeSchema.options}
                    />
                )}
            </ImportUploadForm>
        </ImportPageLayout>
    );
}
