import {ClipboardX} from "lucide-react";
import {SearchType} from "@/lib/schemas";
import {Badge} from "@/lib/client/components/ui/badge";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {ErrorLogCard} from "@/lib/client/components/admin/ErrorLogCard";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {DashboardHeader} from "@/lib/client/components/admin/DashboardHeader";
import {adminErrorLogsOptions} from "@/lib/client/react-query/query-options/admin.options";
import {useAdminDeleteErrorLogsMutation} from "@/lib/client/react-query/query-mutations/admin.mutations";


export const Route = createFileRoute("/_admin/admin/error-logs")({
    validateSearch: (search) => search as SearchType,
    loaderDeps: ({ search }) => ({ search }),
    loader: async ({ context: { queryClient }, deps: { search } }) => {
        return queryClient.ensureQueryData(adminErrorLogsOptions(search));
    },
    component: AdminErrorLogsPage,
})


const DEFAULT = { page: 1 } satisfies SearchType;


function AdminErrorLogsPage() {
    const filters = Route.useSearch();
    const navigate = Route.useNavigate();
    const { page = DEFAULT.page } = filters;
    const apiData = useSuspenseQuery(adminErrorLogsOptions(filters)).data;
    const deleteErrorLogsMutation = useAdminDeleteErrorLogsMutation(filters);

    const onPageChange = async (page: number) => {
        await navigate({ search: { page } });
    };

    const deleteAllErrorLogs = async () => {
        deleteErrorLogsMutation.mutate({ data: { errorIds: null } });
    }

    return (
        <DashboardShell>
            <DashboardHeader heading="Error Logs" description="View and manage system error logs."/>
            <div>
                {apiData.total === 0 ?
                    <EmptyState
                        className="py-8"
                        icon={ClipboardX}
                        message="No error logs found."
                    />
                    :
                    <div className="max-w-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <Badge variant="black" className="px-3 py-1">
                                {apiData.items.length} of {apiData.total} error logs - Page {page}/{apiData.pages}.
                            </Badge>
                            <div>
                                <Button size="sm" variant="destructive" onClick={deleteAllErrorLogs}>
                                    Delete All Logs
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {apiData.items.map((errorLog) =>
                                <ErrorLogCard
                                    key={errorLog.id}
                                    errorLog={errorLog}
                                    onDeleteMutation={deleteErrorLogsMutation}
                                />
                            )}
                        </div>
                        <Pagination
                            currentPage={page}
                            totalPages={apiData.pages}
                            onChangePage={onPageChange}
                        />
                    </div>
                }
            </div>
        </DashboardShell>
    );
}
