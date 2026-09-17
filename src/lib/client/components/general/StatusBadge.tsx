import React from "react";
import {Status} from "@/lib/utils/enums";
import {getThemeColor} from "@/lib/client/theme";
import {Badge} from "@/lib/client/components/ui/badge";


export const StatusBadge = ({ status, className = "" }: { status: Status, className?: string }) => {
    return (
        <Badge className={className} style={{ color: "var(--background)", background: getThemeColor(status) }}>
            {status}
        </Badge>
    );
};
