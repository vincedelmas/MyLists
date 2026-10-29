import {cn} from "@/lib/utils/classnames";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Button} from "@/lib/client/components/ui/button";
import {useEffect, useId, useRef, useState, type ReactNode} from "react";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/lib/client/components/ui/tooltip";


interface AggregateRatingProps {
    label: string;
    children: ReactNode;
}


export const AggregateRating = ({ children, label }: AggregateRatingProps) => {
    const scoreId = useId();
    const { currentUser } = useAuth();
    const [revealed, setRevealed] = useState(false);
    const pressOrigin = useRef<{ x: number; y: number } | null>(null);
    const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const reset = () => {
        if (pressTimer.current !== null) {
            clearTimeout(pressTimer.current);
        }

        pressTimer.current = null;
        pressOrigin.current = null;

        setRevealed(false);
    };

    useEffect(() => () => {
        if (pressTimer.current !== null) {
            clearTimeout(pressTimer.current);
        }
    }, []);

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
                        onBlur={reset}
                        variant="ghost"
                        onPointerLeave={reset}
                        onPointerCancel={reset}
                        onLostPointerCapture={reset}
                        className="cursor-help touch-pan-y"
                        onContextMenu={(ev) => ev.preventDefault()}
                        aria-describedby={revealed ? scoreId : undefined}
                        aria-label={revealed ? label : `Hidden ${label}. Hover or press and hold to reveal. With a keyboard, hold Enter or Space.`}
                        onPointerEnter={(ev) => {
                            if (ev.pointerType === "mouse") setRevealed(true);
                        }}
                        onPointerUp={(ev) => {
                            if (ev.pointerType !== "mouse") reset();
                        }}
                        onKeyUp={(ev) => {
                            if (ev.key === "Enter" || ev.key === " ") reset();
                        }}
                        onPointerMove={(ev) => {
                            const origin = pressOrigin.current;
                            if (origin && Math.hypot(ev.clientX - origin.x, ev.clientY - origin.y) > 10) reset();
                        }}
                        onPointerDown={(ev) => {
                            if (ev.pointerType === "mouse" || ev.button !== 0) return;
                            ev.currentTarget.setPointerCapture(ev.pointerId);
                            pressOrigin.current = { x: ev.clientX, y: ev.clientY };
                            pressTimer.current = setTimeout(() => setRevealed(true), 450);
                        }}
                        onKeyDown={(ev) => {
                            if (ev.key === "Enter" || ev.key === " ") {
                                ev.preventDefault();
                                setRevealed(true);
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
                Hover or hold to reveal rating. With a keyboard, hold Enter or Space.
            </TooltipContent>
        </Tooltip>
    );
};
