import {useState} from "react";
import {Link} from "@tanstack/react-router";
import {Archive, Play, SearchX} from "lucide-react";
import type {TaskMetadata} from "@/lib/types/tasks.types";
import {formatNumber} from "@/lib/utils/formatting/number";
import {buttonVariants} from "@/lib/client/components/ui/button";
import {DataTable} from "@/lib/client/components/general/DataTable";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {SectionHeader} from "@/lib/client/components/general/SectionHeader";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {type ColumnDef, tableFeatures, useTable} from "@tanstack/react-table";
import {TaskFormDialog} from "@/lib/client/components/admin/tasks/TaskFormDialog";
import {formatTaskLabel} from "@/lib/client/components/admin/tasks/task-form.utils";
import {useAdminTriggerTaskMutation} from "@/lib/client/react-query/query-mutations/admin.mutations";


const features = tableFeatures({});


export function TaskDirectory({ tasks }: { tasks: TaskMetadata[] }) {
    const [search, setSearch] = useState("");
    const triggerTaskMutation = useAdminTriggerTaskMutation();

    const query = search.trim().toLowerCase();
    const items = tasks
        .filter(task => `${task.name} ${formatTaskLabel(task.name)} ${task.description}`.toLowerCase().includes(query))
        .sort((a, b) => a.name.localeCompare(b.name));

    const columns: ColumnDef<typeof features, TaskMetadata>[] = [
        {
            header: "Task",
            accessorKey: "name",
            cell: ({ row: { original } }) => (
                <div className="flex min-w-56 max-w-xl flex-col gap-1 whitespace-normal">
                    <span className="font-medium">
                        {formatTaskLabel(original.name)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {original.description}
                    </span>
                </div>
            ),
        },
        {
            id: "actions",
            header: "Run",
            cell: ({ row: { original } }) => {
                const isRunning = triggerTaskMutation.isPending
                    && triggerTaskMutation.variables.data.taskName === original.name;

                return (
                    Object.keys(original.inputSchema.properties).length > 0 ?
                        <TaskFormDialog
                            task={original}
                        />
                        :
                        <LoadingButton
                            size="sm"
                            className="w-24.5"
                            isLoading={isRunning}
                            icon={<Play data-icon="inline-start"/>}
                            disabled={triggerTaskMutation.isPending}
                            aria-label={`Run ${formatTaskLabel(original.name)}`}
                            onClick={() => triggerTaskMutation.mutate({ data: { taskName: original.name, input: {} } })}
                        >
                            {isRunning ? "Running…" : "Run task"}
                        </LoadingButton>
                );
            },
        },
    ];

    const table = useTable({ features, columns, data: items, getRowId: task => task.name });

    return (
        <section className="my-6 flex min-w-0 flex-col gap-4" aria-label="Available tasks">
            <SectionHeader
                title="Available tasks"
                description="Run a task directly or configure its inputs. Completed and failed runs are recorded in the task archive."
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
                <SearchInput
                    value={search}
                    aria-label="Search tasks"
                    placeholder="Search tasks…"
                    className="w-full sm:max-w-80"
                    onChange={ev => setSearch(ev.target.value)}
                />
                <Link to="/admin/archived-tasks" className={buttonVariants({ variant: "outline", size: "sm" })}>
                    <Archive data-icon="inline-start"/>
                    View task archive
                </Link>
            </div>

            {query &&
                <p className="text-xs text-muted-foreground">
                    {formatNumber(items.length)} of {formatNumber(tasks.length)} tasks
                </p>
            }

            <DataTable
                table={table}
                ariaLabel="Available tasks"
                emptyMessage={
                    <EmptyState
                        icon={SearchX}
                        className="py-4"
                        message={query ? "No tasks match your search." : "No tasks available."}
                    />
                }
            />
        </section>
    );
}
