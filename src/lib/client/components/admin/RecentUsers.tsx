import {Link} from "@tanstack/react-router";
import {AdminUserOverview} from "@/lib/types/query.options.types";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";


interface RecentUsersProps {
    users: AdminUserOverview;
}


export function RecentUsers({ users }: RecentUsersProps) {
    return (
        <div className="space-y-5 max-h-86">
            {users.map((user) =>
                <div key={user.id} className="flex items-center">
                    <ProfileIcon
                        fallbackSize="text-sm"
                        className="size-9 border-2"
                        user={{ image: user.image, name: user.name }}
                    />
                    <div className="ml-3 space-y-1">
                        <p className="text-sm font-medium leading-none">
                            <Link
                                to="/profile/$username"
                                params={{ username: user.name }}
                                className="hover:underline hover:underline-offset-2"
                            >
                                {user.name}
                            </Link>
                        </p>
                        <p className="text-sm text-muted-foreground max-w-70 truncate" title={user.email}>
                            {user.email}
                        </p>
                    </div>
                    <div className="ml-auto text-sm">
                        <div className="flex items-center gap-2">
                            <RelativeTime date={user.updatedAt}/>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
