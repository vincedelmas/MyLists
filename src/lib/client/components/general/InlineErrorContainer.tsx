import type {ReactNode} from "react";
import {TriangleAlert, X} from "lucide-react";
import {Button} from "@/lib/client/components/ui/button";
import {Alert, AlertAction, AlertDescription} from "@/lib/client/components/ui/alert";


interface InlineErrorContainerProps {
    children: ReactNode;
    onDismiss?: () => void;
}


export function InlineErrorContainer({ children, onDismiss }: InlineErrorContainerProps) {
    return (
        <Alert variant="destructive" className="has-data-[slot=alert-action]:pr-10">
            <TriangleAlert aria-hidden="true"/>
            <AlertDescription>
                {children}
            </AlertDescription>
            {onDismiss &&
                <AlertAction>
                    <Button type="button" variant="ghost" size="icon-xs" onClick={onDismiss} aria-label="Dismiss error">
                        <X aria-hidden="true"/>
                    </Button>
                </AlertAction>
            }
        </Alert>
    );
}
