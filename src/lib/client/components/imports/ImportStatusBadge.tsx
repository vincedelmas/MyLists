import {ImportJobStatus} from "@/lib/utils/enums";
import {Badge} from "@/lib/client/components/ui/badge";
import {AlertTriangle, CheckCircle2, Clock3, ListRestart} from "lucide-react";


export const ImportStatusBadge = ({ status }: { status: string }) => {
    if (status === ImportJobStatus.COMPLETED) {
        return <Badge variant="success"><CheckCircle2 data-icon="inline-start"/>Completed</Badge>;
    }

    if (status === ImportJobStatus.COMPLETED_WITH_ERRORS) {
        return <Badge variant="secondary"><ListRestart data-icon="inline-start"/>Completed with errors</Badge>;
    }

    if (status === ImportJobStatus.FAILED || status === ImportJobStatus.CANCELLED) {
        return <Badge variant="destructive"><AlertTriangle data-icon="inline-start"/>{status}</Badge>;
    }

    return <Badge variant="outline"><Clock3 data-icon="inline-start"/>{status}</Badge>;
};
