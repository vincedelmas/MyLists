import React from "react";
import type {UseQueryResult} from "@tanstack/react-query";
import {ImportItemStatus} from "@/lib/utils/enums";
import {AlertTriangle} from "lucide-react";
import {Badge} from "@/lib/client/components/ui/badge";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {Pagination} from "@/lib/client/components/general/Pagination";
import type {getImportJobIssues} from "@/lib/server/functions/imports";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/lib/client/components/ui/table";


interface ImportJobIssuesTableProps {
    issueQuery: Pick<UseQueryResult<Awaited<ReturnType<typeof getImportJobIssues>>>, "data" | "isLoading" | "isError">;
    onPageChange: (page: number) => void;
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
                            onChangePage={onPageChange}
                            currentPage={issueQuery.data.page}
                            totalPages={issueQuery.data.pages}
                        />
                    </>
            }
        </div>
    );
}
