import {Play} from "lucide-react";
import {toast} from "@/lib/client/components/ui/toast";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {TaskFormDialog} from "@/lib/client/components/admin/TaskDialogForm";
import {DashboardHeader} from "@/lib/client/components/admin/DashboardHeader";
import {adminTasksOptions} from "@/lib/client/react-query/query-options/admin.options";
import {useAdminTriggerTaskMutation} from "@/lib/client/react-query/query-mutations/admin.mutations";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


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
    const taskTriggerMutation = useAdminTriggerTaskMutation();
    const tasksList = useSuspenseQuery(tasksQueryOptions).data;

    const executeTask = (taskName: string, input = {}) => {
        taskTriggerMutation.mutate({ data: { taskName, input } }, {
            onSettled: () => toast.add({ title: `Task ${taskName} Finished`, type: "info" }),
        });
    };

    return (
        <DashboardShell>
            <DashboardHeader heading="Admin Tasks" description="Manage and execute maintenance and background tasks."/>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tasksList.map((task) => {
                    const isRunning = taskTriggerMutation.isPending && taskTriggerMutation.variables.data.taskName === task.name;

                    return (
                        <Card key={task.name}>
                            <CardHeader className="h-full">
                                <CardTitle>{task.name}</CardTitle>
                                <CardDescription>{task.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {Object.values(task.inputSchema.properties).length > 0 ?
                                    <TaskFormDialog
                                        task={task}
                                    />
                                    :
                                    <LoadingButton
                                        size="sm"
                                        isLoading={isRunning}
                                        icon={<Play className="size-4"/>}
                                        onClick={() => executeTask(task.name)}
                                    >
                                        {isRunning ? "Running" : "Run Task"}
                                    </LoadingButton>
                                }
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </DashboardShell>
    );
}
