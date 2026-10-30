import {Check} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {Spinner} from "@/lib/client/components/ui/spinner";


interface SaveFeedbackIndicatorProps {
    loading: boolean;
    success: boolean;
    pending: boolean;
    className?: string;
}


export function SaveFeedbackIndicator({ loading, success, pending, className }: SaveFeedbackIndicatorProps) {
    return (
        <span role="status" className={cn("pointer-events-none inline-flex size-4 shrink-0 items-center justify-center", className)}>
            {loading ?
                <>
                    <Spinner aria-hidden="true"/>
                    <span className="sr-only">Saving...
                    </span>
                </>
                :
                <span className={cn(
                    pending ? "transition-none" : "transition-opacity duration-200 motion-reduce:transition-none",
                    success ? "opacity-100" : "opacity-0",
                )}>
                    <Check aria-hidden="true" className="size-4 text-success"/>
                    {success &&
                        <span className="sr-only">Saved</span>
                    }
                </span>
            }
        </span>
    );
}
