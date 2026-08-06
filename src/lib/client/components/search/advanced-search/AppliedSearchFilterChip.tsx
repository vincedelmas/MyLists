import {X} from "lucide-react";
import {Badge} from "@/lib/client/components/ui/badge";
import {Button} from "@/lib/client/components/ui/button";


interface AppliedSearchFilterChipProps {
    label: string;
    onRemove: () => void;
}


export const AppliedSearchFilterChip = ({ label, onRemove }: AppliedSearchFilterChipProps) => (
    <Badge variant="secondary" className="h-7 gap-1.5 pl-2.5 pr-1 text-xs">
        <span className="max-w-52 truncate">
            {label}
        </span>
        <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={onRemove}
            aria-label={`Remove ${label} filter`}
            className="size-5 rounded-full text-muted-foreground hover:text-foreground"
        >
            <X/>
        </Button>
    </Badge>
);
