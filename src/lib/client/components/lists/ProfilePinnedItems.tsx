import {cn} from "@/lib/utils/classnames";
import {Link} from "@tanstack/react-router";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {formatNumber} from "@/lib/utils/formatting/number";
import {buttonVariants} from "@/lib/client/components/ui/button";
import {ArrowUpRight, Layers3, LibraryBig, Pin} from "lucide-react";
import {PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import type {ProfilePinsData} from "@/lib/client/react-query/query-options/profile-pins.options";


interface ProfilePinnedItemsProps {
    isCurrent: boolean;
    pins: ProfilePinsData;
}


export const ProfilePinnedItems = ({ pins, isCurrent }: ProfilePinnedItemsProps) => {
    const { currentUser } = useAuth();
    if (pins.items.length === 0) return null;

    return (
        <section aria-labelledby="profile-pinned-items-title" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <h2 id="profile-pinned-items-title" className="flex items-center gap-2 text-sm font-semibold">
                        <Pin className="size-3.5 text-brand" aria-hidden="true"/> Pinned lists & collections
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        Quick access to selected lists and collections
                    </p>
                </div>
                {isCurrent &&
                    <Link
                        to="/lists/$username"
                        params={{ username: currentUser!.name }}
                        className={cn(buttonVariants({ variant: "hover", size: "sm" }))}
                    >
                        Manage
                        <ArrowUpRight data-icon="inline-end" aria-hidden="true"/>
                    </Link>
                }
            </div>
            <div className="grid grid-cols-2 gap-2">
                {pins.items.map(item => {
                    const title = item.kind === "dynamic" ? item.view.spec.title : item.collection.title;
                    const count = item.kind === "dynamic" ? item.preview.total : item.collection.itemsCount;
                    const Icon = item.kind === "dynamic" ? Layers3 : LibraryBig;
                    const target = item.kind === "dynamic"
                        ? { to: "/lists/dynamic/$listId" as const, params: { listId: item.view.id }, search: { page: 1 } }
                        : { to: "/lists/collections/$collectionId" as const, params: { collectionId: item.collection.id }, search: { page: 1 } };

                    return (
                        <article key={`${item.kind}:${item.kind === "dynamic" ? item.view.id : item.collection.id}`} className="min-w-0">
                            <Link
                                {...target}
                                aria-label={title}
                                title={title}
                                className="group flex min-w-0 flex-col gap-1 rounded-lg border border-border/70 p-2.5 outline-none transition-colors hover:border-brand/30 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <div className="flex min-w-0 items-center gap-2">
                                    <Icon className="size-3.5 shrink-0 text-brand" aria-hidden="true"/>
                                    <h3 className="min-w-0 flex-1 truncate text-sm font-medium group-hover:text-brand">
                                        {title}
                                    </h3>
                                    <ArrowUpRight className="size-3 shrink-0 text-muted-foreground" aria-hidden="true"/>
                                </div>
                                <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                                    <span className="shrink-0 tabular-nums">{formatNumber(count)} media</span>
                                    <span aria-hidden="true">·</span>
                                    <span className="truncate">{item.kind === "dynamic" ? "Dynamic list" : "Collection"}</span>
                                    {item.kind === "collection" &&
                                        <span className="ml-auto shrink-0" role="img" aria-label={`${item.collection.privacy} collection`}
                                              title={`${item.collection.privacy} collection`}>
                                            <PrivacyIcon type={item.collection.privacy}/>
                                        </span>
                                    }
                                </div>
                            </Link>
                        </article>
                    );
                })}
            </div>
        </section>
    );
};
