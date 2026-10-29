import {cn} from "@/lib/utils/classnames";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Button} from "@/lib/client/components/ui/button";
import {useId, useRef, useState, type ReactNode} from "react";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/lib/client/components/ui/tooltip";


interface AggregateRatingProps {
    label: string;
    children: ReactNode;
}


export const AggregateRating = ({ children, label }: AggregateRatingProps) => {
    const scoreId = useId();
    const { currentUser } = useAuth();
    const [hovered, setHovered] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const pointerType = useRef<string | null>(null);

    const revealed = hovered || expanded;

    if (!currentUser?.hideAggregateRatings) {
        return children;
    }

    return (
        <Tooltip disabled={revealed}>
            <TooltipTrigger
                render={
                    <Button
                        size="bare"
                        type="button"
                        variant="ghost"
                        aria-expanded={revealed}
                        onBlur={() => setExpanded(false)}
                        aria-describedby={revealed ? scoreId : undefined}
                        aria-label={revealed ? label : `Hidden ${label}. Hover or tap to reveal. Tap again to hide.`}
                        className="relative cursor-help touch-manipulation after:absolute after:-inset-x-4 after:-inset-y-2"
                        onPointerEnter={(ev) => {
                            if (ev.pointerType === "mouse") setHovered(true);
                        }}
                        onPointerLeave={(ev) => {
                            if (ev.pointerType === "mouse") setHovered(false);
                        }}
                        onPointerDown={(ev) => {
                            pointerType.current = ev.pointerType;
                        }}
                        onClick={(ev) => {
                            if (ev.detail === 0 || pointerType.current !== "mouse") {
                                setExpanded(value => !value);
                            }
                        }}
                    />
                }
            >
                <span className="pointer-events-none grid place-items-center">
                    <span
                        id={scoreId}
                        aria-hidden={!revealed}
                        className={cn("col-start-1 row-start-1", !revealed && "invisible w-0 overflow-hidden")}
                    >
                        {children}
                    </span>
                    {!revealed &&
                        <span aria-hidden="true" className="col-start-1 row-start-1 text-sm leading-none text-muted-foreground">
                            –
                        </span>
                    }
                </span>
            </TooltipTrigger>
            <TooltipContent>
                Hover or tap to reveal rating. Tap again to hide. With a keyboard, press Enter or Space.
            </TooltipContent>
        </Tooltip>
    );
};
