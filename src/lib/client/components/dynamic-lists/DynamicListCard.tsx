import {Pin} from "lucide-react";
import {Link} from "@tanstack/react-router";
import {useQuery} from "@tanstack/react-query";
import type {MediaType} from "@/lib/utils/enums";
import {formatNumber} from "@/lib/utils/formatting/number";
import {ActionsMenu} from "@/lib/client/components/general/ActionsMenu";
import {DynamicListBadges} from "@/lib/client/components/dynamic-lists/DynamicListBadges";
import {DynamicListActions} from "@/lib/client/components/dynamic-lists/DynamicListActions";
import {ListCoverStrip} from "@/lib/client/components/lists/ListCoverStrip";
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {dynamicListSummaryOptions, type DynamicListRecord, type DynamicListSummary} from "@/lib/client/react-query/query-options/dynamic-lists.options";


type DynamicListCardProps = { view: DynamicListRecord; activeMediaTypes: readonly MediaType[] } & ({ isOwner?: true; preview?: DynamicListSummary } | { isOwner: boolean; preview: DynamicListSummary });


export const DynamicListCard = ({ view, activeMediaTypes, isOwner = true, preview: suppliedPreview }: DynamicListCardProps) => {
    const previewQuery = useQuery({ ...dynamicListSummaryOptions(view.spec), enabled: isOwner && suppliedPreview === undefined });

    const preview = suppliedPreview ?? previewQuery.data;

    const countLabel = preview
        ? `${formatNumber(preview.total)} media`
        : previewQuery.isError ? "Count unavailable" : "Loading media…";

    return (
        <Card className="relative min-w-0 gap-0 py-0 transition-shadow hover:ring-brand hover:shadow-sm sm:flex-row" role="article" aria-label={view.spec.title}>
            <Link
                search={{ page: 1 }}
                to="/lists/dynamic/$listId"
                params={{ listId: view.id }}
                aria-label={view.spec.title}
                className="absolute inset-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            />
            <ListCoverStrip
                variant="showcase"
                covers={preview?.covers ?? []}
                className="pointer-events-none h-28 w-full sm:h-auto sm:w-44 sm:self-stretch xl:w-52"
            />
            <div className="pointer-events-none flex min-w-0 flex-1 flex-col gap-3 py-4 sm:py-5">
                <CardHeader className="min-w-0 gap-y-2" title={view.spec.title}>
                    <CardTitle className="flex min-w-0 items-center gap-2">
                        {view.profilePosition !== null && <Pin className="size-3.5 shrink-0 fill-brand/20 text-brand" aria-label="Pinned to profile"/>}
                        <span className="truncate">{view.spec.title}</span>
                    </CardTitle>
                    <CardDescription>
                        {countLabel}
                    </CardDescription>

                    {isOwner &&
                        <CardAction className="pointer-events-auto relative">
                            <ActionsMenu label={`Actions for ${view.spec.title}`}>
                                <DynamicListActions view={view}/>
                            </ActionsMenu>
                        </CardAction>
                    }
                </CardHeader>
                <CardContent className="min-w-0">
                    <DynamicListBadges
                        spec={view.spec}
                        activeMediaTypes={activeMediaTypes}
                    />
                </CardContent>
            </div>
        </Card>
    );
};
