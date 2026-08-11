import {RefObject, useEffect, useRef} from "react";


type Handler = (event: MouseEvent | TouchEvent) => void;


const TOUCH_TAP_TOLERANCE_PX = 10;
const SYNTHETIC_MOUSE_EVENT_DELAY_MS = 700;


export const useOnClickOutside = <T extends HTMLElement = HTMLElement>(ref: RefObject<T | null>, handler: Handler): void => {
    const handlerRef = useRef(handler);

    useEffect(() => {
        handlerRef.current = handler;
    }, [handler]);

    useEffect(() => {
        let touchStart: { identifier: number; x: number; y: number; moved: boolean } | null = null;
        let lastTouchEndAt = 0;

        const isOutside = (event: MouseEvent | TouchEvent) => (
            !!ref.current && !ref.current.contains(event.target as Node)
        );

        const mouseListener = (event: MouseEvent) => {
            // Touch taps can emit a compatibility mouse event after touchend.
            if (Date.now() - lastTouchEndAt < SYNTHETIC_MOUSE_EVENT_DELAY_MS || !isOutside(event)) return;
            handlerRef.current(event);
        };

        const touchStartListener = (event: TouchEvent) => {
            const touch = event.changedTouches[0];
            if (!touch || !isOutside(event)) {
                touchStart = null;
                return;
            }

            touchStart = {
                identifier: touch.identifier,
                x: touch.clientX,
                y: touch.clientY,
                moved: false,
            };
        };

        const touchMoveListener = (event: TouchEvent) => {
            if (!touchStart || touchStart.moved) return;

            const touch = Array.from(event.changedTouches)
                .find((changedTouch) => changedTouch.identifier === touchStart?.identifier);
            if (!touch) return;

            const distance = Math.hypot(touch.clientX - touchStart.x, touch.clientY - touchStart.y);
            touchStart.moved = distance > TOUCH_TAP_TOLERANCE_PX;
        };

        const touchEndListener = (event: TouchEvent) => {
            if (!touchStart) return;

            const start = touchStart;
            touchStart = null;
            lastTouchEndAt = Date.now();

            const touch = Array.from(event.changedTouches)
                .find((changedTouch) => changedTouch.identifier === start.identifier);
            if (!touch || !isOutside(event)) return;

            const distance = Math.hypot(touch.clientX - start.x, touch.clientY - start.y);
            if (!start.moved && distance <= TOUCH_TAP_TOLERANCE_PX) {
                handlerRef.current(event);
            }
        };

        const touchCancelListener = () => {
            touchStart = null;
            lastTouchEndAt = Date.now();
        };

        document.addEventListener("mousedown", mouseListener);
        document.addEventListener("touchstart", touchStartListener, {passive: true});
        document.addEventListener("touchmove", touchMoveListener, {passive: true});
        document.addEventListener("touchend", touchEndListener, {passive: true});
        document.addEventListener("touchcancel", touchCancelListener, {passive: true});

        return () => {
            document.removeEventListener("mousedown", mouseListener);
            document.removeEventListener("touchstart", touchStartListener);
            document.removeEventListener("touchmove", touchMoveListener);
            document.removeEventListener("touchend", touchEndListener);
            document.removeEventListener("touchcancel", touchCancelListener);
        };
    }, [ref]);
};
