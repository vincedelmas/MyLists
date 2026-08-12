import {RefObject, useEffect, useEffectEvent} from "react";


type Handler = (event: PointerEvent) => void;


const TAP_TOLERANCE_PX = 10;


export const useOnClickOutside = <T extends HTMLElement = HTMLElement>(ref: RefObject<T | null>, handler: Handler): void => {
    const onClickOutside = useEffectEvent(handler);

    useEffect(() => {
        let pointerStart: { id: number; x: number; y: number; moved: boolean } | null = null;

        const isOutside = (event: PointerEvent) => (
            !!ref.current && !ref.current.contains(event.target as Node)
        );

        const pointerDownListener = (event: PointerEvent) => {
            if (!event.isPrimary || event.button !== 0 || !isOutside(event)) {
                pointerStart = null;
                return;
            }

            pointerStart = {
                id: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                moved: false,
            };
        };

        const pointerMoveListener = (event: PointerEvent) => {
            if (!pointerStart || pointerStart.id !== event.pointerId || pointerStart.moved) return;

            const distance = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
            pointerStart.moved = distance > TAP_TOLERANCE_PX;
        };

        const pointerUpListener = (event: PointerEvent) => {
            if (!pointerStart || pointerStart.id !== event.pointerId) return;

            const start = pointerStart;
            pointerStart = null;

            if (start.moved || !isOutside(event)) return;

            const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
            if (distance <= TAP_TOLERANCE_PX) {
                onClickOutside(event);
            }
        };

        const pointerCancelListener = (event: PointerEvent) => {
            if (pointerStart?.id === event.pointerId) pointerStart = null;
        };

        document.addEventListener("pointerdown", pointerDownListener);
        document.addEventListener("pointermove", pointerMoveListener, {passive: true});
        document.addEventListener("pointerup", pointerUpListener);
        document.addEventListener("pointercancel", pointerCancelListener);

        return () => {
            document.removeEventListener("pointerdown", pointerDownListener);
            document.removeEventListener("pointermove", pointerMoveListener);
            document.removeEventListener("pointerup", pointerUpListener);
            document.removeEventListener("pointercancel", pointerCancelListener);
        };
    }, [ref]);
};
