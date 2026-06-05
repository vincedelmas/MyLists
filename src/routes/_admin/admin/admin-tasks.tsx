import {toast} from "sonner";
import {Loader2, Play} from "lucide-react";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {TaskFormDialog} from "@/lib/client/components/admin/TaskDialogForm";
import {DashboardHeader} from "@/lib/client/components/admin/DashboardHeader";
import {adminTasksOptions} from "@/lib/client/react-query/query-options/admin.options";
import {useAdminTriggerTaskMutation} from "@/lib/client/react-query/query-mutations/admin.mutations";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


export const Route = createFileRoute("/_admin/admin/admin-tasks")({
    loader: async ({ context: { queryClient } }) => {
        return queryClient.ensureQueryData(adminTasksOptions);
    },
    component: AdminTasksPage,
});


function AdminTasksPage() {
    const taskTriggerMutation = useAdminTriggerTaskMutation();
    const tasksList = useSuspenseQuery(adminTasksOptions).data;

    const executeTask = (taskName: string, input = {}) => {
        taskTriggerMutation.mutate({ data: { taskName, input } }, {
            onSettled: () => toast.info(`Task ${taskName} Finished`),
        });
    };

    return (
        <DashboardShell>
            <DashboardHeader heading="Admin Tasks" description="Manage and execute maintenance and background tasks."/>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tasksList.map((task) => {
                    const isRunning = taskTriggerMutation.isPending
                        && taskTriggerMutation.variables.data.taskName === task.name;

                    return (
                        <Card key={task.name}>
                            <CardHeader>
                                <CardTitle>{task.name}</CardTitle>
                                <CardDescription>{task.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {Object.values(task.inputSchema.properties).length > 0 ?
                                    <TaskFormDialog
                                        task={task}
                                        isRunning={isRunning}
                                        mutation={taskTriggerMutation}
                                    />
                                    :
                                    <Button
                                        size="sm"
                                        variant="emeraldy"
                                        disabled={isRunning}
                                        onClick={() => executeTask(task.name)}
                                    >
                                        {isRunning ? <Loader2 className="size-4 animate-spin"/> : <Play className="size-4"/>}
                                        {isRunning ? "Running" : "Run Task"}
                                    </Button>
                                }
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </DashboardShell>
    );
}
