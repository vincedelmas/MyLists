import React from "react";
import {ImportItemStatus} from "@/lib/utils/enums";
import {Badge} from "@/lib/client/components/ui/badge";
import {AlertTriangle, CheckCircle2} from "lucide-react";
import type {UseQueryResult} from "@tanstack/react-query";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Pagination} from "@/lib/client/components/general/Pagination";
import type {getImportJobIssues} from "@/lib/server/functions/imports";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/lib/client/components/ui/table";


interface ImportJobIssuesTableProps {
    onPageChange: (page: number) => void;
    issueQuery: Pick<UseQueryResult<Awaited<ReturnType<typeof getImportJobIssues>>>, "data" | "isLoading" | "isError">;
}


export function ImportJobIssuesTable({ issueQuery, onPageChange }: ImportJobIssuesTableProps) {
    return (
        <div className="flex flex-col gap-3">
            <div>
                <h3 className="flex items-center gap-2 text-base font-bold">
                    <AlertTriangle className="size-4 text-warning"/>
                    Rows needing attention
                </h3>
                <p className="text-sm text-muted-foreground">
                    Review the reason for each row. Correct invalid data, retry temporary errors, or add unmatched media manually.
                </p>
            </div>

            {issueQuery.isLoading ?
                <div className="rounded-xl border bg-muted/20 p-5 text-sm text-muted-foreground">
                    <Spinner/>
                </div>
                :
                issueQuery.isError || !issueQuery.data ?
                    <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
                        Import issues could not be loaded.
                    </div>
                    :
                    <>
                        <div className="overflow-hidden rounded-xl border">
                            <Table aria-label="Import row issues">
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
                                    {issueQuery.data.items.length === 0 &&
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">
                                                <EmptyState
                                                    icon={CheckCircle2}
                                                    message="No row issues to display."
                                                />
                                            </TableCell>
                                        </TableRow>
                                    }
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
                            onChangePage={onPageChange}
                            currentPage={issueQuery.data.page}
                            totalPages={issueQuery.data.pages}
                        />
                    </>
            }
        </div>
    );
}
