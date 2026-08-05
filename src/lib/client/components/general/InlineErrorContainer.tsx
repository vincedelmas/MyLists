import React from "react";
import {TriangleAlert, X} from "lucide-react";


interface InlineErrorContainerProps {
    children: React.ReactNode;
    onDismiss?: () => void;
}


export function InlineErrorContainer({ children, onDismiss }: InlineErrorContainerProps) {
    const [hide, setHide] = React.useState(false);

    if (hide) return null;

    const onHide = () => {
        setHide(true);
        onDismiss?.();
    };

    return (
        <div className="relative flex w-full items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-2.5 text-xs font-medium text-destructive">
            <TriangleAlert className="shrink-0 size-3.5"/>
            <div className="w-[90%]">
                {children}
            </div>
            <button type="button" onClick={onHide} aria-label="Dismiss error" className="absolute right-2 cursor-pointer">
                <X className="size-4"/>
            </button>
        </div>
    );
}
