import {Users} from "lucide-react";
import {Link} from "@tanstack/react-router";
import {AdminUserOverview} from "@/lib/types/query.options.types";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";


export function RecentUsers({ users }: { users: AdminUserOverview }) {
    if (users.length === 0) {
        return (
            <EmptyState
                icon={Users}
                className="py-8"
                message="No recent user activity to display."
            />
        );
    }

    return (
        <ul className="flex max-h-86 flex-col gap-5 overflow-y-auto pr-3 scrollbar-thin">
            {users.map((user) =>
                <li key={user.id} className="flex min-w-0 items-center gap-3">
                    <ProfileIcon
                        fallbackSize="text-sm"
                        className="size-9 shrink-0 border-2"
                        user={{ image: user.image, name: user.name }}
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <p className="truncate text-sm font-medium leading-none">
                            <Link
                                to="/profile/$username"
                                params={{ username: user.name }}
                                className="hover:underline hover:underline-offset-2"
                            >
                                {user.name}
                            </Link>
                        </p>
                        <p className="truncate text-sm text-muted-foreground" title={user.email}>
                            {user.email}
                        </p>
                    </div>
                    <RelativeTime
                        date={user.updatedAt}
                        className="shrink-0 text-xs text-muted-foreground"
                    />
                </li>
            )}
        </ul>
    );
}
