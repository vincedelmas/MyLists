import {AlertTriangle} from "lucide-react";
import {ImportSource} from "@/lib/utils/enums";
import {createFileRoute} from "@tanstack/react-router";
import {letterboxdCsvTypeSchema} from "@/lib/schemas/imports.schema";
import {ImportUploadForm} from "@/lib/client/components/imports/ImportUploadForm";
import {Alert, AlertDescription, AlertTitle} from "@/lib/client/components/ui/alert";
import {ImportFileTypeField} from "@/lib/client/components/imports/ImportFileTypeField";
import {ImportInstructions, ImportPageLayout} from "@/lib/client/components/imports/ImportPageLayout";


export const Route = createFileRoute("/_main/_private/settings/_layout/imports/letterboxd")({
    component: LetterboxdImportPage,
});


function LetterboxdImportPage() {
    return (
        <ImportPageLayout description="Upload your Letterboxd ratings, watched films, or watchlist to your Movies list.">
            <Alert variant="warning">
                <AlertTriangle/>
                <AlertTitle>
                    Important: import in this order: ratings.csv → watched.csv → watchlist.csv
                </AlertTitle>
                <AlertDescription>
                    <ul className="flex list-disc flex-col gap-1.5 pl-4">
                        <li>Existing movies are never updated !</li>
                        <li>Wait for each import to finish and review the row issues before uploading the next file.</li>
                        <li>Importing <b>watched.csv</b> first means a later <b>ratings.csv</b> import will not add the ratings !</li>
                    </ul>
                </AlertDescription>
            </Alert>

            <ImportInstructions>
                <li>
                    <a
                        target="_blank"
                        rel="noreferrer"
                        href="https://letterboxd.com/user/exportdata/"
                        className="underline underline-offset-2 hover:text-brand"
                    >
                        Export your data from Letterboxd
                    </a> and extract the downloaded ZIP.
                </li>
                <li>
                    Select the matching CSV file type below and upload
                    <b>ratings.csv</b>, then <b>watched.csv</b>, then <b>watchlist.csv</b>.
                </li>
                <li>
                    Ratings become Completed with a score out of 10 (3.5 stars → 7/10);
                    watched films become Completed;
                    watchlist films become Plan to Watch.
                </li>
                <li>Only movies are supported. Diary entries, rewatches, reviews, likes, and custom lists are not imported.</li>
            </ImportInstructions>

            <ImportUploadForm defaultValues={{ source: ImportSource.LETTERBOXD, letterboxdFileType: "ratings" }}>
                {({ control, isSubmitting }) => (
                    <ImportFileTypeField
                        control={control}
                        name="letterboxdFileType"
                        isSubmitting={isSubmitting}
                        label="Letterboxd CSV file type"
                        options={letterboxdCsvTypeSchema.options}
                    />
                )}
            </ImportUploadForm>
        </ImportPageLayout>
    );
}
