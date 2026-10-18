import {useState} from "react";
import {Link} from "@tanstack/react-router";
import {Archive, ListTodo} from "lucide-react";
import type {TaskStatus} from "@/lib/types/tasks.types";
import {TaskCard} from "@/lib/client/components/admin/TaskCard";
import {buttonVariants} from "@/lib/client/components/ui/button";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {FilterSelect} from "@/lib/client/components/general/FilterSelect";
import {SectionHeader} from "@/lib/client/components/general/SectionHeader";
import {formatTaskLabel} from "@/lib/client/components/admin/tasks/task-form.utils";
import type {AdminArchivedTasksData} from "@/lib/client/react-query/query-options/admin.options";


const statusOptions = [
    { value: "all", label: "All statuses" },
    { value: "completed", label: "Completed" },
    { value: "partial", label: "Partial" },
    { value: "failed", label: "Failed" },
] as const;


export function TaskArchive({ tasks }: { tasks: AdminArchivedTasksData }) {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<TaskStatus | "all">("all");

    const query = search.trim().toLowerCase();

    const filteredTasks = tasks.filter(task => {
        const matchesStatus = status === "all" || task.logs.status === status;
        const matchesSearch = `${task.logs.taskName} ${formatTaskLabel(task.logs.taskName)} ${task.taskId}`
            .toLowerCase().includes(query);

        return matchesStatus && matchesSearch;
    });

    return (
        <section className="my-6 flex min-w-0 flex-col gap-4" aria-label="Archived task runs">
            <SectionHeader
                title="Run history"
                description="Completed, partial, and failed runs, newest first. Expand a run to inspect its logs and steps."
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
                    <SearchInput
                        value={search}
                        className="w-full sm:w-80"
                        aria-label="Search archived tasks"
                        placeholder="Search by task name or run ID…"
                        onChange={event => setSearch(event.target.value)}
                    />
                    <FilterSelect
                        value={status}
                        className="w-40"
                        options={statusOptions}
                        label="Task run status"
                        onChange={setStatus}
                    />
                </div>
                <Link
                    to="/admin/admin-tasks"
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                    <ListTodo data-icon="inline-start"/>
                    Available tasks
                </Link>
            </div>
            {filteredTasks.length > 0 ?
                <div className="flex min-w-0 flex-col gap-4">
                    {filteredTasks.map(task =>
                        <TaskCard
                            task={task}
                            key={task.id}
                        />
                    )}
                </div>
                :
                <EmptyState
                    icon={Archive}
                    className="py-8"
                    message={query || status !== "all"
                        ? "No archived runs match these filters."
                        : "No task runs archived yet."
                    }
                />
            }
        </section>
    );
}
