import React from "react";
import {createFileRoute} from "@tanstack/react-router";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {DashboardHeader} from "@/lib/client/components/admin/DashboardHeader";


export const Route = createFileRoute("/_admin/admin/error-logs")({
    component: AdminRuntimeLogsPage,
})


function AdminRuntimeLogsPage() {
    return (
        <DashboardShell>
            <DashboardHeader
                heading="Runtime Logs"
                description="Read the configured PM2/runtime log file without storing errors in the database."
            />
        </DashboardShell>
    );
}
