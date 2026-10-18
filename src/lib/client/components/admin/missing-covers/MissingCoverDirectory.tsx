import {useId, useState} from "react";
import {useQueryClient} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {CheckCheck, RefreshCw, SearchX} from "lucide-react";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import type {AdminMissingCoversSearch} from "@/lib/schemas/admin.schema";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {FilterSelect} from "@/lib/client/components/general/FilterSelect";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {Field, FieldGroup, FieldLabel} from "@/lib/client/components/ui/field";
import {createMediaSelectItems} from "@/lib/client/components/general/media-type-options";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";
import {MissingCoverQueue} from "@/lib/client/components/admin/missing-covers/MissingCoverQueue";
import {MissingCoverEditor} from "@/lib/client/components/admin/missing-covers/MissingCoverEditor";
import {adminMissingCoversOptions, type AdminMissingCoversData} from "@/lib/client/react-query/query-options/admin.options";


interface MissingCoverDirectoryProps {
    isRefreshing: boolean;
    isRefreshError: boolean;
    data: AdminMissingCoversData;
    filters: AdminMissingCoversSearch;
    onRefresh: () => Promise<unknown>;
}


const mediaTypeOptions = createMediaSelectItems(ALL_MEDIA_TYPES, {
    leading: "all",
    leadingLabel: "All media types",
});


export function MissingCoverDirectory({ data, filters, isRefreshing, isRefreshError, onRefresh }: MissingCoverDirectoryProps) {
    const fieldId = useId();
    const queryClient = useQueryClient();
    const [selectedKey, setSelectedKey] = useState<string>();
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<AdminMissingCoversSearch>({
        search: filters.search ?? "",
        options: { resetScroll: false },
    });

    const hasFilters = Boolean(filters.search || filters.mediaType);
    const selected = data.items.find(item => `${item.mediaType}:${item.mediaId}` === selectedKey) ?? data.items[0];

    const onCoverUpdated = () => {
        const updated = queryClient.getQueryData(adminMissingCoversOptions(filters).queryKey)!;
        const lastPage = Math.max(updated.pages, 1);

        if (updated.page > lastPage) {
            updateFilters({ page: lastPage });
        }
    };

    return (
        <section className="mt-4 mb-6 flex min-w-0 flex-col gap-5" aria-label="Missing cover directory">
            <div className="flex flex-wrap items-end gap-3">
                <FieldGroup className="flex-1 sm:flex-row">
                    <Field>
                        <FieldLabel htmlFor={`${fieldId}-search`}>
                            Media title
                        </FieldLabel>
                        <SearchInput
                            value={localSearch}
                            id={`${fieldId}-search`}
                            onChange={handleInputChange}
                            placeholder="Search media without covers…"
                        />
                    </Field>
                    <Field className="sm:max-w-60">
                        <FieldLabel htmlFor={`${fieldId}-type`}>
                            Media type
                        </FieldLabel>
                        <FilterSelect
                            label="Media type"
                            options={mediaTypeOptions}
                            id={`${fieldId}-type`}
                            className="w-full"
                            value={filters.mediaType ?? "all"}
                            onChange={value => updateFilters({
                                page: 1,
                                mediaType: value === "all" ? undefined : value as AdminMissingCoversSearch["mediaType"],
                            })}
                        />
                    </Field>
                </FieldGroup>
                <LoadingButton
                    variant="outline"
                    isLoading={isRefreshing}
                    icon={<RefreshCw data-icon="inline-start"/>}
                    onClick={() => {
                        void onRefresh();
                    }}
                >
                    Refresh list
                </LoadingButton>
            </div>

            {isRefreshError &&
                <InlineErrorContainer>
                    Missing covers could not be refreshed. Showing the last loaded results.
                </InlineErrorContainer>
            }

            {selected ? (
                <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                    <MissingCoverQueue
                        items={data.items}
                        selected={selected}
                        onSelect={media => setSelectedKey(`${media.mediaType}:${media.mediaId}`)}
                    />

                    <MissingCoverEditor
                        media={selected}
                        onUpdated={onCoverUpdated}
                        key={`${selected.mediaType}:${selected.mediaId}`}
                    />
                </div>
            ) : (
                <div className="flex flex-col items-center gap-4 py-12">
                    <EmptyState
                        icon={data.total || hasFilters ? SearchX : CheckCheck}
                        message={data.total
                            ? "No media on this page. Go to the previous page to continue."
                            : hasFilters
                                ? "No matching media. Try another title or media type."
                                : "All covers are in place. Every media item in the catalog has a cover."
                        }
                    />
                    {data.total > 0 && data.page > 1 &&
                        <Button variant="outline" onClick={() => updateFilters({ page: data.page - 1 })}>
                            Previous page
                        </Button>
                    }
                </div>
            )}

            <Pagination
                currentPage={data.page}
                totalPages={Math.max(data.page, data.pages)}
                onChangePage={page => updateFilters({ page })}
            />
        </section>
    );
}
