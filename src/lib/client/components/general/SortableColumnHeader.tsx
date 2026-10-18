import type {ReactNode} from "react";
import {Button} from "@/lib/client/components/ui/button";
import {ArrowDown, ArrowUp, ChevronsUpDown} from "lucide-react";


interface SortableColumnHeaderProps {
    children: ReactNode;
    column: {
        toggleSorting: () => void;
        getIsSorted: () => false | "asc" | "desc";
    };
}


export function SortableColumnHeader({ column, children }: SortableColumnHeaderProps) {
    const direction = column.getIsSorted();
    const Icon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ChevronsUpDown;

    return (
        <Button
            size="xs"
            variant="ghost"
            onClick={() => column.toggleSorting()}
            title={direction ? `Sorted ${direction === "asc" ? "ascending" : "descending"}` : "Sort column"}
        >
            {children}
            <Icon data-icon="inline-end" aria-hidden="true"/>
        </Button>
    );
}
