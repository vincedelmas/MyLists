import type {ReactNode} from "react";
import {EllipsisVertical} from "lucide-react";
import {Button} from "@/lib/client/components/ui/button";
import {DropdownMenu, DropdownMenuContent, DropdownMenuTrigger} from "@/lib/client/components/ui/dropdown-menu";


export const ActionsMenu = ({ label, children }: { label: string; children: ReactNode }) => (
    <DropdownMenu>
        <DropdownMenuTrigger render={<Button size="icon" variant="hover" aria-label={label}/>}>
            <EllipsisVertical/>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-50">
            {children}
        </DropdownMenuContent>
    </DropdownMenu>
);
