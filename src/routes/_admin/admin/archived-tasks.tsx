import {Archive} from "lucide-react";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {formatNumber} from "@/lib/utils/formatting/number";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {TaskArchive} from "@/lib/client/components/admin/tasks/TaskArchive";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {adminArchivedTasksOptions} from "@/lib/client/react-query/query-options/admin.options";


export const Route = createFileRoute("/_admin/admin/archived-tasks")({
    context: () => ({
        archivedTasksQueryOptions: adminArchivedTasksOptions,
    }),
    loader: ({ context }) => {
        return context.queryClient.query({ ...context.archivedTasksQueryOptions, staleTime: "static" });
    },
    component: AdminArchivedTasksPage,
});


function AdminArchivedTasksPage() {
    const { archivedTasksQueryOptions } = Route.useRouteContext();
    const archivedTasks = useSuspenseQuery(archivedTasksQueryOptions).data;

    return (
        <DashboardShell>
            <PageHeader
                title="Task archive"
                eyebrowIcon={Archive}
                eyebrow="Administration"
                asideLabel="Archived runs"
                asideValue={formatNumber(archivedTasks.length)}
                description="Review task outcomes, timings, logs, and step details."
            />
            <TaskArchive
                tasks={archivedTasks}
            />
        </DashboardShell>
    );
}
