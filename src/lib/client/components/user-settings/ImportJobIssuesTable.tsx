import React from "react";
import {AlertTriangle} from "lucide-react";
import {useNavigate} from "@tanstack/react-router";
import {ImportItemStatus} from "@/lib/utils/enums";
import {Badge} from "@/lib/client/components/ui/badge";
import {useSuspenseQuery} from "@tanstack/react-query";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {importJobIssuesOptions} from "@/lib/client/react-query/query-options";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/lib/client/components/ui/table";


interface ImportJobIssuesTableProps {
    page: number;
    jobId: number;
}


export function ImportJobIssuesTable({ jobId, page }: ImportJobIssuesTableProps) {
    const navigate = useNavigate({ from: "/settings/imports" });
    const issueQuery = useSuspenseQuery(importJobIssuesOptions(jobId, { page, perPage: 25 }));

    const handlePageChange = (nextPage: number) => {
        void navigate({ search: prev => ({ ...prev, page: nextPage, jobId }), resetScroll: false });
    };

    return (
        <div className="space-y-3">
            <div>
                <h3 className="flex items-center gap-2 text-base font-bold">
                    <AlertTriangle className="size-4 text-amber-500"/>
                    Media to Add by Hand
                </h3>
                <p className="text-sm text-muted-foreground">
                    These rows were not added automatically because they failed validation, were not found, or were ambiguous.
                </p>
            </div>

            <div className="overflow-hidden rounded-xl border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Row</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Reason</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {issueQuery.data.items.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>
                                    {item.rowNumber}
                                </TableCell>
                                <TableCell className="font-medium">
                                    {item.name ?? DEFAULT_DASH_FALLBACK}
                                </TableCell>
                                <TableCell>
                                    {item.releaseDate ?? "—"}
                                </TableCell>
                                <TableCell className="capitalize">
                                    {item.mediaType ?? DEFAULT_DASH_FALLBACK}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={item.status === ImportItemStatus.FAILED ? "destructive" : "secondary"}>
                                        {item.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="max-w-xl whitespace-normal text-muted-foreground">
                                    {item.statusReason}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Pagination
                onChangePage={handlePageChange}
                currentPage={issueQuery.data.page}
                totalPages={issueQuery.data.pages}
            />
        </div>
    );
}
