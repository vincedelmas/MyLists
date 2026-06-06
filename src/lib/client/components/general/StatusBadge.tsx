import React from "react";
import {Status} from "@/lib/utils/enums";
import {Badge} from "@/lib/client/components/ui/badge";
import {getThemeColor} from "@/lib/utils/theme-utils";


export const StatusBadge = ({ status }: { status: Status }) => {
    return (
        <Badge style={{ color: "black", background: getThemeColor(status) }}>
            {status}
        </Badge>
    );
};
