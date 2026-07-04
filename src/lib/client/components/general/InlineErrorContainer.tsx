import React from "react";
import {TriangleAlert, X} from "lucide-react";


interface InlineErrorContainerProps {
    children: React.ReactNode;
}


export function InlineErrorContainer({ children }: InlineErrorContainerProps) {
    const [hide, setHide] = React.useState(false);

    if (hide) return null;

    const onHide = () => {
        setHide(true);
    }

    return (
        <div className="relative p-2.5 rounded-lg border text-xs font-medium flex items-center gap-2 bg-red-500/5 border-red-500/20 text-destructive">
            <TriangleAlert className="shrink-0 size-3.5"/>
            <div className="w-[94%]">
                {children}
            </div>
            <div role="button" className="absolute right-2 cursor-pointer" onClick={onHide}>
                <X/>
            </div>
        </div>
    );
}
