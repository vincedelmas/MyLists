import {Archive} from "lucide-react";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {TaskCard} from "@/lib/client/components/admin/TaskCard";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {DashboardHeader} from "@/lib/client/components/admin/DashboardHeader";
import {adminArchivedTasksOptions} from "@/lib/client/react-query/query-options/admin.options";


export const Route = createFileRoute("/_admin/admin/archived-tasks")({
    context: () => ({
        archivedTasksQueryOptions: adminArchivedTasksOptions,
    }),
    loader: ({ context }) => {
        return context.queryClient.ensureQueryData(context.archivedTasksQueryOptions);
    },
    component: AdminArchivedTasksPage,
})


function AdminArchivedTasksPage() {
    const { archivedTasksQueryOptions } = Route.useRouteContext();
    const archivedTasks = useSuspenseQuery(archivedTasksQueryOptions).data;

    return (
        <DashboardShell>
            <DashboardHeader heading="Archived Tasks" description="Manage and execute maintenance and background tasks."/>
            <div>
                {archivedTasks.length === 0 ?
                    <EmptyState
                        icon={Archive}
                        className="py-8"
                        message="No archived tasks found."
                    />
                    :
                    <div className="space-y-4">
                        {archivedTasks.map((task) =>
                            <TaskCard
                                task={task}
                                key={task.id}
                            />
                        )}
                    </div>
                }
            </div>
        </DashboardShell>
    );
}
