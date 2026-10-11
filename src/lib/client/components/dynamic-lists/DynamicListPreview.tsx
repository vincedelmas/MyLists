import {useMemo} from "react";
import {useQuery} from "@tanstack/react-query";
import {Badge} from "@/lib/client/components/ui/badge";
import {Button} from "@/lib/client/components/ui/button";
import {useDebounce} from "@/lib/client/hooks/use-debounce";
import {formatNumber} from "@/lib/utils/formatting/number";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {Separator} from "@/lib/client/components/ui/separator";
import {Alert, AlertDescription} from "@/lib/client/components/ui/alert";
import {Card, CardContent, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {dynamicListRules} from "@/lib/client/components/dynamic-lists/dynamic-list.utils";
import {dynamicListSpecSchema, type DynamicListSpec} from "@/lib/schemas/dynamic-lists.schema";
import {dynamicListSummaryOptions} from "@/lib/client/react-query/query-options/dynamic-lists.options";


interface DynamicListPreviewProps {
    spec: DynamicListSpec;
    tagNames: Record<number, string>;
}


export const DynamicListPreview = ({ spec, tagNames }: DynamicListPreviewProps) => {
    const countSpec = useMemo<DynamicListSpec>(() => ({
        version: 2,
        display: "grid",
        title: "Dynamic list",
        filters: spec.filters,
        mediaTypes: spec.mediaTypes,
        sort: { field: "addedAt", direction: "desc" },
    }), [spec.filters, spec.mediaTypes]);

    const debouncedCountSpec = useDebounce(countSpec, 300);
    const countValidation = dynamicListSpecSchema.safeParse(debouncedCountSpec);
    const countIsCurrent = countSpec === debouncedCountSpec && countValidation.success;

    const rules = dynamicListRules(spec, tagNames);
    const countQuery = useQuery({ ...dynamicListSummaryOptions(debouncedCountSpec), enabled: countValidation.success });

    return (
        <aside className="min-w-0 lg:sticky lg:top-22" aria-label="Preview dynamic list">
            <Card>
                <CardHeader>
                    <CardTitle>
                        <h2 aria-live="polite" aria-busy={!countIsCurrent || countQuery.isFetching}>
                            {countIsCurrent && countQuery.data
                                ? formatNumber(countQuery.data.total)
                                : DEFAULT_DASH_FALLBACK
                            } media
                        </h2>
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                    <Separator/>
                    <div className="flex flex-col gap-3">
                        <p className="text-xs font-medium text-muted-foreground">
                            Match every rule below
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {rules.length ?
                                rules.map((rule, index) =>
                                    <Badge key={`${index}-${rule}`} variant="outline" className="h-auto max-w-full">
                                        <span className="whitespace-normal break-words">
                                            {rule}
                                        </span>
                                    </Badge>
                                )
                                :
                                <p className="text-sm text-muted-foreground">
                                    Every title in the selected tracking lists.
                                </p>
                            }
                        </div>
                    </div>
                    {countQuery.isError &&
                        <Alert variant="destructive">
                            <AlertDescription>
                                We couldn’t count matching media.
                                <Button type="button" variant="ghost" size="sm" onClick={() => void countQuery.refetch()}>
                                    Try again
                                </Button>
                            </AlertDescription>
                        </Alert>
                    }
                </CardContent>
            </Card>
        </aside>
    );
};
