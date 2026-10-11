import type {ReactNode} from "react";
import {cn} from "@/lib/utils/classnames";
import {Button} from "@/lib/client/components/ui/button";


interface MediaFilterChoiceProps {
    label: string;
    ariaLabel?: string;
    title?: string;
    selected?: boolean;
    disabled?: boolean;
    actions?: ReactNode;
    onSelect: () => void;
}


export const MediaFilterChoice = ({ label, ariaLabel, title, selected = false, disabled, actions, onSelect }: MediaFilterChoiceProps) => (
    <div className="inline-flex max-w-full items-center gap-0.5">
        <Button
            type="button"
            variant="outline"
            size="xs"
            title={title}
            aria-label={ariaLabel}
            aria-pressed={selected}
            disabled={disabled}
            onClick={onSelect}
            className={cn("h-auto min-w-0 max-w-full shrink whitespace-normal break-words text-left", selected && "border-brand/40 bg-brand/10 text-brand")}
        >
            <span className="min-w-0 break-words">{label}</span>
        </Button>
        {actions}
    </div>
);
