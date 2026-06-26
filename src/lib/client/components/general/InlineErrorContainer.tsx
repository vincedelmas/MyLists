import React from "react";
import {TriangleAlert} from "lucide-react";


interface InlineErrorContainerProps {
    children: React.ReactNode;
}


export function InlineErrorContainer({ children }: InlineErrorContainerProps) {
    return (
        <div className="p-2.5 rounded-lg border text-xs font-medium flex items-center gap-2 shadow-lg bg-red-500/5
            border-red-500/20 text-red-400">
            <TriangleAlert className="size-3.5"/>
            {children}
        </div>
    );
}
