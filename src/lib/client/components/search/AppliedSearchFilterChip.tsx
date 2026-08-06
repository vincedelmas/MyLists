import {X} from "lucide-react";
import {Badge} from "@/lib/client/components/ui/badge";
import {Button} from "@/lib/client/components/ui/button";


interface AppliedSearchFilterChipProps {
    label: string;
    onRemove: () => void;
}


export const AppliedSearchFilterChip = ({ label, onRemove }: AppliedSearchFilterChipProps) => (
    <Badge variant="outline">
        <span className="max-w-52 truncate">
            {label}
        </span>
        <Button size="bare" type="button" variant="ghost" onClick={onRemove} aria-label={`Remove ${label} filter`}>
            <X/>
        </Button>
    </Badge>
);
