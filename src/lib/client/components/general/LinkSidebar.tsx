import {cn} from "@/lib/utils/classnames";
import {Link, LinkProps} from "@tanstack/react-router";
import {Button} from "@/lib/client/components/ui/button";
import {Separator} from "@/lib/client/components/ui/separator";


export interface LinkSidebarItem {
    id: string;
    label: string;
    to: LinkProps["to"];
    type?: "item" | "separator";
}


export const LinkSidebar = ({ items }: { items: LinkSidebarItem[] }) => {
    return (
        <nav
            className={cn(
                "flex flex-row overflow-x-auto pb-4 gap-2 scrollbar-thin",
                "md:flex-col md:overflow-visible md:pb-0 md:gap-3",
                "border-b md:border-none bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60",
            )}
        >
            {items.map((item) => {
                if (item.type === "separator") {
                    return <Separator key={item.id} className="my-3 hidden md:block"/>;
                }

                return (
                    <Button key={item.id} className="justify-start text-sm shrink-0 whitespace-nowrap" variant="ghost" asChild>
                        <Link to={item.to} activeProps={{ className: "bg-emerald-500/50 text-primary" }}>
                            {item.label}
                        </Link>
                    </Button>
                );
            })}
        </nav>
    );
};
