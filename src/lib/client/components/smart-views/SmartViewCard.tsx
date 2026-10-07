import {Link} from "@tanstack/react-router";
import {useQuery} from "@tanstack/react-query";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {formatNumber} from "@/lib/utils/formatting/number";
import {LayoutGrid, PencilLine, Table2, Trash2} from "lucide-react";
import {Button, buttonVariants} from "@/lib/client/components/ui/button";
import {SmartViewBadges} from "@/lib/client/components/smart-views/SmartViewBadges";
import {SmartListPinButton} from "@/lib/client/components/smart-views/SmartListPinButton";
import {SmartListCoverStrip} from "@/lib/client/components/smart-views/SmartListCoverStrip";
import {useDeleteSmartViewMutation} from "@/lib/client/react-query/query-mutations/smart-views.mutations";
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {smartViewSummaryOptions, type SmartViewRecord, type SmartViewSummary} from "@/lib/client/react-query/query-options/smart-views.options";


type SmartViewCardProps = { view: SmartViewRecord } & ({ isOwner?: true; preview?: SmartViewSummary } | { isOwner: boolean; preview: SmartViewSummary });


export const SmartViewCard = ({ view, isOwner = true, preview: suppliedPreview }: SmartViewCardProps) => {
    const confirm = useConfirm();
    const deleteMutation = useDeleteSmartViewMutation();
    const previewQuery = useQuery({ ...smartViewSummaryOptions(view.spec), enabled: isOwner && suppliedPreview === undefined });

    const preview = suppliedPreview ?? previewQuery.data;
    const DisplayIcon = view.spec.display === "grid" ? LayoutGrid : Table2;

    const countLabel = preview
        ? `${formatNumber(preview.total)} media`
        : previewQuery.isError ? "Count unavailable" : "Loading media…";

    return (
        <Card className="relative min-w-0 transition-shadow hover:shadow-sm [--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(6)]" role="article"
              aria-label={view.spec.title}>
            <Link
                search={{ page: 1 }}
                to="/smart-views/$viewId"
                params={{ viewId: view.id }}
                aria-label={view.spec.title}
                className="absolute inset-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            />
            <CardHeader className="pointer-events-none gap-y-3">
                <CardTitle className="break-words">
                    {view.spec.title}
                </CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="tabular-nums">{countLabel}</span>
                    <span className="flex items-center gap-1.5 text-xs">
                        <DisplayIcon className="size-3.5" aria-hidden="true"/>
                        {view.spec.display === "grid" ? "Grid" : "Table"}
                    </span>
                </CardDescription>

                {isOwner &&
                    <CardAction className="pointer-events-auto relative flex items-center gap-1">
                        <SmartListPinButton view={view} compact/>
                        <Link
                            search={{ page: 1 }}
                            params={{ viewId: view.id }}
                            to="/smart-views/$viewId/edit"
                            aria-label={`Edit ${view.spec.title}`}
                            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                        >
                            <PencilLine/>
                        </Link>
                        <Button
                            type="button"
                            size="icon-sm"
                            variant="destructiveGhost"
                            disabled={deleteMutation.isPending}
                            aria-label={`Delete ${view.spec.title}`}
                            onClick={async () => {
                                if (await confirm({
                                    variant: "destructive",
                                    confirmLabel: "Delete list",
                                    title: "Delete this smart list?",
                                    description: "This smart list will be deleted. The titles in your tracking lists stay as they are.",
                                })) deleteMutation.mutate(view.id);
                            }}
                        >
                            {deleteMutation.isPending ? <Spinner/> : <Trash2/>}
                        </Button>
                    </CardAction>
                }
            </CardHeader>
            <CardContent className="pointer-events-none flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <SmartViewBadges spec={view.spec} className="flex-1"/>
                {preview && preview.covers.length > 0 &&
                    <SmartListCoverStrip
                        covers={preview.covers}
                    />
                }
            </CardContent>
        </Card>
    );
};
