import {Terminal} from "lucide-react";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {adminLogFilesOptions} from "@/lib/client/react-query/query-options/admin.options";
import {RuntimeLogBrowser} from "@/lib/client/components/admin/runtime-logs/RuntimeLogBrowser";


export const Route = createFileRoute("/_admin/admin/error-logs")({
    context: () => ({
        logFilesQueryOptions: adminLogFilesOptions,
    }),
    loader: ({ context }) => {
        return context.queryClient.query({ ...context.logFilesQueryOptions, staleTime: "static" });
    },
    component: AdminRuntimeLogsPage,
});


function AdminRuntimeLogsPage() {
    const { logFilesQueryOptions } = Route.useRouteContext();
    const filesQuery = useSuspenseQuery(logFilesQueryOptions);

    return (
        <DashboardShell>
            <PageHeader
                title="Runtime logs"
                eyebrowIcon={Terminal}
                asideLabel="Log files"
                eyebrow="Administration"
                asideValue={filesQuery.data.length}
                description="Inspect application logs, filter by severity, and read error details."
            />
            <RuntimeLogBrowser
                files={filesQuery.data}
                onRefreshFiles={filesQuery.refetch}
                isFilesRefreshError={filesQuery.isError}
                isRefreshingFiles={filesQuery.isFetching}
            />
        </DashboardShell>
    );
}
