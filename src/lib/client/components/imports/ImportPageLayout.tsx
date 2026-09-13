import type {ReactNode} from "react";
import {Info} from "lucide-react";
import {Alert, AlertDescription, AlertTitle} from "@/lib/client/components/ui/alert";


interface ImportPageLayoutProps {
    description: string;
    children: ReactNode;
}


export function ImportPageLayout({ description, children }: ImportPageLayoutProps) {
    return (
        <div className="flex flex-col gap-6 px-2">
            <p className="text-sm text-muted-foreground">
                {description}
            </p>

            <Alert variant="branded">
                <Info/>
                <AlertTitle>General Info</AlertTitle>
                <AlertDescription>
                    <ul className="flex list-disc flex-col gap-1.5 pl-4">
                        <li>You can leave this page while the import runs.</li>
                        <li>Rows that cannot be matched automatically need to be added by hand.</li>
                        <li>Media already in your list are ignored, the row is still marked as completed.</li>
                        <li>Your import joins a queue. Processing is scheduled every 2 min, and other imports can be ahead of yours.</li>
                    </ul>
                </AlertDescription>
            </Alert>

            {children}
        </div>
    );
}


export function ImportInstructions({ children }: { children: ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <h3 className="text-lg font-bold">
                Instructions
            </h3>
            <ol className="flex list-decimal flex-col gap-1.5 pl-4 text-sm text-muted-foreground">
                {children}
                <li>Make sure that this list is enabled in Content & Lists so it appears on your profile.</li>
                <li>Refresh the job status to check its progress.</li>
                <li>Review skipped or failed rows.</li>
            </ol>
        </div>
    );
}
