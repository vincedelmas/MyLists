import {Square, SquareCheck} from "lucide-react";
import type {ReactNode} from "react";
import {cn} from "@/lib/utils/classnames";
import {Button} from "@/lib/client/components/ui/button";


interface MediaTagChoiceProps {
    label: string;
    ariaLabel?: string;
    title?: string;
    count?: number;
    selected?: boolean;
    disabled?: boolean;
    actions?: ReactNode;
    onSelect: () => void;
}


export const MediaTagChoice = ({ label, ariaLabel, title, count, selected = false, disabled, actions, onSelect }: MediaTagChoiceProps) => (
    <div className="flex w-full min-w-0 items-center gap-1">
        <Button
            type="button"
            variant="hover"
            size="sm"
            title={title}
            aria-label={ariaLabel ?? label}
            aria-pressed={selected}
            disabled={disabled}
            onClick={onSelect}
            className={cn("h-auto min-h-10 min-w-0 flex-1 justify-start whitespace-normal break-words text-left", selected && "bg-brand/5 text-brand")}
        >
            {selected ? <SquareCheck data-icon="inline-start"/> : <Square data-icon="inline-start"/>}
            <span className="min-w-0 flex-1 break-words">{label}</span>
            {count !== undefined && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{count}</span>}
        </Button>
        {actions}
    </div>
);
