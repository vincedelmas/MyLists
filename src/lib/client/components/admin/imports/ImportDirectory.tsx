import {useId, useState} from "react";
import {RefreshCw} from "lucide-react";
import {ImportJobStatus} from "@/lib/utils/enums";
import type {AdminImportsSearch} from "@/lib/schemas/admin.schema";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {FilterSelect} from "@/lib/client/components/general/FilterSelect";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {Field, FieldGroup, FieldLabel} from "@/lib/client/components/ui/field";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";
import type {AdminImportsData} from "@/lib/client/react-query/query-options/admin.options";
import {ImportDetailsSheet} from "@/lib/client/components/admin/imports/ImportDetailsSheet";
import {ImportHistoryTable} from "@/lib/client/components/admin/imports/ImportHistoryTable";


interface ImportDirectoryProps {
    isRefreshing: boolean;
    isRefreshError: boolean;
    history: AdminImportsData;
    filters: AdminImportsSearch;
    onRefresh: () => Promise<unknown>;
}


const statusOptions = [
    { value: "all", label: "All statuses" },
    ...Object.values(ImportJobStatus).map(value => ({
        value,
        label: <span className="capitalize">{value.replaceAll("_", " ")}</span>,
    })),
];


export function ImportDirectory({ filters, history, isRefreshing, isRefreshError, onRefresh }: ImportDirectoryProps) {
    const fieldId = useId();
    const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<AdminImportsSearch>({
        search: filters.search ?? "",
        options: { resetScroll: false },
    });

    const selectedJob = history.items.find(job => job.id === selectedJobId);

    return (
        <section className="mt-4 mb-6 flex min-w-0 flex-col gap-4" aria-label="Import monitoring">
            <div className="flex flex-wrap items-end gap-3">
                <FieldGroup className="flex-1 sm:flex-row">
                    <Field>
                        <FieldLabel htmlFor={`${fieldId}-search`}>
                            Account or job ID
                        </FieldLabel>
                        <SearchInput
                            value={localSearch}
                            id={`${fieldId}-search`}
                            onChange={handleInputChange}
                            placeholder="Search imports…"
                        />
                    </Field>
                    <Field className="sm:max-w-60">
                        <FieldLabel htmlFor={`${fieldId}-status`}>
                            Status
                        </FieldLabel>
                        <FilterSelect
                            label="Status"
                            options={statusOptions}
                            id={`${fieldId}-status`}
                            className="w-full capitalize"
                            value={filters.status ?? "all"}
                            onChange={value => updateFilters({ status: value === "all" ? undefined : value as ImportJobStatus, page: 1 })}
                        />
                    </Field>
                </FieldGroup>
                <LoadingButton
                    variant="outline"
                    isLoading={isRefreshing}
                    icon={<RefreshCw data-icon="inline-start"/>}
                    onClick={() => {
                        void onRefresh()
                    }}
                >
                    Refresh
                </LoadingButton>
            </div>

            {isRefreshError &&
                <InlineErrorContainer>
                    Import history could not be refreshed. Showing the last loaded results.
                </InlineErrorContainer>
            }

            <ImportHistoryTable
                history={history}
                selectedJobId={selectedJobId}
                onSelectJob={setSelectedJobId}
                onPageChange={page => updateFilters({ page })}
                hasFilters={Boolean(filters.search || filters.status)}
            />

            {selectedJob &&
                <ImportDetailsSheet
                    key={selectedJob.id}
                    job={selectedJob}
                    onRefresh={onRefresh}
                    isRefreshing={isRefreshing}
                    isRefreshError={isRefreshError}
                    onClose={() => setSelectedJobId(null)}
                />
            }
        </section>
    );
}
