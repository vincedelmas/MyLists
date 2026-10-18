import {formatNumber, formatPercent} from "@/lib/utils/formatting/number";
import {CompactStatsGrid} from "@/lib/client/components/media-stats/CompactStatsGrid";
import {Activity, CheckCircle2, MailWarning, RefreshCw, Trash2, UsersRound} from "lucide-react";
import type {AdminInactiveAccountsData} from "@/lib/client/react-query/query-options/admin.options";


export function InactiveAccountStats({ stats }: { stats: AdminInactiveAccountsData["stats"] }) {
    return (
        <section className="my-6 rounded-xl border p-5 shadow-xs sm:p-6" aria-label="Inactive account statistics">
            <CompactStatsGrid
                columns={6}
                items={[
                    {
                        label: "Awaiting deletion",
                        note: "Warning email sent",
                        value: formatNumber(stats.warned),
                        icon: <UsersRound className="size-4"/>,
                    },
                    {
                        label: "Retrying email",
                        note: "Warning not yet delivered",
                        value: formatNumber(stats.retrying),
                        icon: <RefreshCw className="size-4"/>,
                    },
                    {
                        label: "Email failed",
                        note: "Maximum attempts reached",
                        value: formatNumber(stats.mailFailed),
                        icon: <MailWarning className="size-4"/>,
                    },
                    {
                        label: "Reactivated",
                        note: "Returned after inactivity",
                        value: formatNumber(stats.resurrected),
                        icon: <CheckCircle2 className="size-4"/>,
                    },
                    {
                        label: "Deleted",
                        note: "Removed for inactivity",
                        value: formatNumber(stats.deleted),
                        icon: <Trash2 className="size-4"/>,
                    },
                    {
                        label: "Reactivation rate",
                        note: "Among warned accounts",
                        icon: <Activity className="size-4"/>,
                        value: formatPercent(stats.resurrectionRate * 100),
                    },
                ]}/>
        </section>
    );
}
