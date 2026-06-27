import {Button} from "@/lib/client/components/ui/button";
import {Separator} from "@/lib/client/components/ui/separator";


export interface SidebarItem {
    id: string;
    label: string;
    isActive?: boolean;
    onClick?: () => void;
    type?: "item" | "separator";
}


export const Sidebar = ({ items }: { items: SidebarItem[] }) => {
    return (
        <nav className="flex flex-wrap text-muted-foreground justify-center md:flex-col md:gap-3 md:justify-start">
            {items.map((item) => {
                if (item.type === "separator") {
                    return <Separator key={item.id} className="my-3"/>;
                }

                return (
                    <Button
                        key={item.id}
                        onClick={item.onClick}
                        className="justify-start text-sm"
                        variant={item.isActive ? "emeraldy" : "ghost"}
                    >
                        {item.label}
                    </Button>
                );
            })}
        </nav>
    );
};
