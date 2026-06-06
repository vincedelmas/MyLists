import {ActivityEditor} from "@/lib/types/activity.types";
import {CheckCircle, Hourglass, RotateCw} from "lucide-react";


export function ActivityStatusIcon({ row }: { row: ActivityEditor }) {
    const { label, icon: Icon } = (() => {
        if (row.isRedo) return { label: "Re-experience", icon: RotateCw };
        if (row.isCompleted) return { label: "Completed", icon: CheckCircle };
        return { label: "In progress", icon: Hourglass };
    })();

    return (
        <span className="ml-auto" title={label}>
            <Icon className="text-neutral-300" size={12}/>
        </span>
    );
}
