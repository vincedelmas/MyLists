import React from "react";
import {Loader2} from "lucide-react";
import {cn} from "@/lib/utils/classnames";


function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
    return (
        <Loader2
            role="status"
            data-slot="spinner"
            aria-label="Loading"
            className={cn("size-4 animate-spin text-brand", className)}
            {...props}
        />
    );
}


export {Spinner};
