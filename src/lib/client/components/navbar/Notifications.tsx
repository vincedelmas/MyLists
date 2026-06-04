import {useState} from "react";
import {Link} from "@tanstack/react-router";
import {useQuery} from "@tanstack/react-query";
import {SocialNotifType} from "@/lib/utils/enums";
import {zeroPad} from "@/lib/utils/number-formatting";
import {Badge} from "@/lib/client/components/ui/badge";
import {Button} from "@/lib/client/components/ui/button";
import {NotifTab} from "@/lib/types/notifications.types";
import {useBreakpoint} from "@/lib/client/hooks/use-breakpoint";
import {TabHeader} from "@/lib/client/components/general/TabHeader";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {Popover, PopoverContent, PopoverTrigger} from "@/lib/client/components/ui/popover";
import {Bell, LoaderCircle, MessageCircleOff, MoveRight, Play, Users, X} from "lucide-react";
import {formatCalendarRelativeDate, formatDate, formatRelativeTime} from "@/lib/utils/date-formatting";
import {notificationsCountOptions, notificationsOptions} from "@/lib/client/react-query/query-options";
import {useDeleteSocialNotif, useMarkAllNotifAsRead, useRespondFollowRequest} from "@/lib/client/react-query/query-mutations/user.mutations";


type NotificationUnion = Awaited<ReturnType<NonNullable<ReturnType<typeof notificationsOptions>["queryFn"]>>>;
type MediaNotif = Exclude<NotificationUnion[number], { actor: any }>;
type SocialNotif = Extract<NotificationUnion[number], { actor: any }>;


export const Notifications = () => {
    const mutation = useMarkAllNotifAsRead();
    const isBelowLg = useBreakpoint("lg");
    const [open, setOpen] = useState(false);
    const { data: counts } = useQuery(notificationsCountOptions);
    const [activeTab, setActiveTab] = useState<NotifTab>("media");
    const { data: notifications, isLoading } = useQuery(notificationsOptions(open, activeTab));

    const handleMarkAsRead = async (type: NotifTab) => {
        const unreadCount = (type === "social") ? counts?.social : counts?.media;
        if (unreadCount && unreadCount > 0) {
            mutation.mutate({ data: { type } });
        }
    };

    const handleTabChange = async (newTab: string) => {
        await handleMarkAsRead(activeTab);
        setActiveTab(newTab as NotifTab);
    };

    const handleOpenChange = async (isOpen: boolean) => {
        if (!isOpen && open) {
            await handleMarkAsRead(activeTab);
        }
        setOpen(isOpen);
    };

    const tabs = [
        {
            id: "media",
            label: (
                <>
                    Media{" "}
                    {!!counts?.media &&
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                            {counts.media}
                        </Badge>
                    }
                </>
            ),
            isAccent: true,
            icon: <Play className="size-4"/>
        }, {
            id: "social",
            isAccent: true,
            label: (
                <>
                    Social{" "}
                    {!!counts?.social &&
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                            {counts.social}
                        </Badge>
                    }
                </>
            ),
            icon: <Users className="size-4"/>
        }
    ]

    return (
        <Popover modal={isBelowLg} open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative mr-3">
                    <Bell className="size-5"/>
                    {!!counts?.total &&
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                        >
                            {counts.total > 99 ? "99+" : counts.total}
                        </Badge>
                    }
                </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-82 max-h-76 overflow-y-auto scrollbar-thin max-sm:max-h-88" align="end">
                <TabHeader
                    tabs={tabs}
                    activeTab={activeTab}
                    setActiveTab={handleTabChange}
                />

                <div className="px-3 py-2">
                    {activeTab === "media" && (
                        isLoading ?
                            <div className="flex items-center justify-center py-10 px-6">
                                <LoaderCircle className="size-6 animate-spin"/>
                            </div>
                            :
                            notifications?.length === 0 ?
                                <EmptyState
                                    className="py-6"
                                    icon={MessageCircleOff}
                                    message="No media notifications"
                                />
                                :
                                notifications?.map((notif) =>
                                    <MediaNotificationItem
                                        key={`media-${notif.id}`}
                                        notif={notif as MediaNotif}
                                    />
                                )
                    )}

                    {activeTab === "social" && (
                        isLoading ?
                            <div className="flex items-center justify-center py-10 px-6">
                                <LoaderCircle className="size-6 animate-spin"/>
                            </div>
                            :
                            notifications?.length === 0 ?
                                <EmptyState
                                    className="py-6"
                                    icon={MessageCircleOff}
                                    message="No social notifications"
                                />
                                :
                                notifications?.map((notif) =>
                                    <SocialNotificationItem
                                        key={`social-${notif.id}`}
                                        notification={notif as SocialNotif}
                                    />
                                )
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};


const MediaNotificationItem = ({ notif }: { notif: MediaNotif }) => {
    const isUnread = !notif.read;
    const isTvNotification = notif.season !== null;
    const { relativeTime } = formatCalendarRelativeDate(notif.releaseDate, { style: "long" });

    return (
        <div className="relative flex gap-3 py-3 px-2 border-b hover:bg-muted/30 rounded-lg mt-1">
            <div className="mt-0.5">
                <div className="flex items-center justify-center">
                    <MainThemeIcon
                        className="size-4 mt-0.5"
                        type={notif.mediaType}
                    />
                </div>
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-start">
                    <p className="text-sm">
                        <Link
                            search={{ external: false }}
                            to="/details/$mediaType/$mediaId"
                            params={{ mediaType: notif.mediaType, mediaId: notif.mediaId }}
                        >
                            <span title={notif.name} className="font-medium text-foreground line-clamp-1 max-w-55 hover:text-app-accent">
                                {notif.name}
                            </span>
                        </Link>
                    </p>
                </div>
                <div className="flex items-baseline justify-between">
                    <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-primary/80">
                        <span>
                            {isTvNotification
                                ? `S${zeroPad(notif.season)}.E${zeroPad(notif.episode)} ${notif.isSeasonFinale ? "(Finale)" : ""}`
                                : <div>Release</div>
                            }
                        </span>
                        <MoveRight className="size-4 text-app-accent"/>
                        <span>{formatDate(notif.releaseDate)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {relativeTime}
                    </div>
                </div>
            </div>
            {isUnread &&
                <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-cyan-500 shrink-0"/>
            }
        </div>
    );
};


const SocialNotificationItem = ({ notification }: { notification: SocialNotif }) => {
    const isUnread = !notification.read;
    const deleteMutation = useDeleteSocialNotif();
    const respondMutation = useRespondFollowRequest();
    const relativeTime = formatRelativeTime(notification.createdAt);
    const isFollowRequest = notification.type === SocialNotifType.FOLLOW_REQUESTED;

    const respond = async (action: "accept" | "decline") => {
        respondMutation.mutate({ data: { followerId: notification.actor.id, action } });
    };

    const deleteNotif = async () => {
        deleteMutation.mutate({ data: { notificationId: notification.id } });
    };

    const getMessage = () => {
        switch (notification.type) {
            case SocialNotifType.NEW_FOLLOWER:
                return " started following you";
            case SocialNotifType.FOLLOW_REQUESTED:
                return " requested to follow you";
            case SocialNotifType.FOLLOW_ACCEPTED:
                return " accepted your follow request";
            case SocialNotifType.FOLLOW_DECLINED:
                return " declined your follow request";
            case SocialNotifType.FEATURE_REQUEST_CREATED:
                return " submitted a new feature request";
            case SocialNotifType.FEATURE_REQUEST_UPDATED:
                return " updated your feature request";
            default:
                return "";
        }
    };

    return (
        <div className="flex flex-col gap-2 rounded-md hover:bg-muted/30 border-b p-3 last:border-b-0">
            <div className="flex items-center gap-3">
                <Link to="/profile/$username" params={{ username: notification.actor.name }}>
                    <ProfileIcon
                        fallbackSize="text-sm"
                        className="size-10 border-2"
                        user={{ image: notification.actor.image, name: notification.actor.name }}
                    />
                </Link>
                <div className="min-w-0 flex-1">
                    <p className="text-sm">
                        <span className="font-medium">
                            <Link to="/profile/$username" params={{ username: notification.actor.name }}>
                                {notification.actor.name}
                            </Link>
                        </span>
                        {getMessage()}
                        {notification.featureRequest &&
                            <>
                                {": "}
                                <Link to="/features-vote" className="font-medium text-app-accent">
                                    here
                                </Link>
                            </>
                        }
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {relativeTime}
                    </p>
                </div>
                {isUnread &&
                    <div className="size-2 shrink-0 rounded-full bg-blue-500"/>
                }
                <button
                    onClick={deleteNotif}
                    className="opacity-70 hover:opacity-100"
                    disabled={deleteMutation.isPending || respondMutation.isPending}
                >
                    <X className="size-3.5"/>
                </button>
            </div>

            {isFollowRequest &&
                <div className="ml-13 flex gap-2">
                    <Button
                        size="xs"
                        variant="emeraldy"
                        onClick={() => respond("accept")}
                        disabled={deleteMutation.isPending || respondMutation.isPending}
                    >
                        Accept
                    </Button>
                    <Button
                        size="xs"
                        variant="outline"
                        onClick={() => respond("decline")}
                        disabled={deleteMutation.isPending || respondMutation.isPending}
                    >
                        Decline
                    </Button>
                </div>
            }
        </div>
    );
};
