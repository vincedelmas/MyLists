import {ListTodo} from "lucide-react";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {formatNumber} from "@/lib/utils/formatting/number";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {TaskDirectory} from "@/lib/client/components/admin/tasks/TaskDirectory";
import {adminTasksOptions} from "@/lib/client/react-query/query-options/admin.options";


export const Route = createFileRoute("/_admin/admin/admin-tasks")({
    context: () => ({
        tasksQueryOptions: adminTasksOptions,
    }),
    loader: ({ context }) => {
        return context.queryClient.query({ ...context.tasksQueryOptions, staleTime: "static" });
    },
    component: AdminTasksPage,
});


function AdminTasksPage() {
    const { tasksQueryOptions } = Route.useRouteContext();
    const tasks = useSuspenseQuery(tasksQueryOptions).data;

    return (
        <DashboardShell>
            <PageHeader
                title="Tasks"
                eyebrowIcon={ListTodo}
                eyebrow="Administration"
                asideLabel="Available tasks"
                asideValue={formatNumber(tasks.length)}
                description="Run maintenance jobs and configure background tasks."
            />
            <TaskDirectory
                tasks={tasks}
            />
        </DashboardShell>
    );
}
