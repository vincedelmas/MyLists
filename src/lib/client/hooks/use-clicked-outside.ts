import {RefObject, useEffect} from "react";


type Handler = (event: MouseEvent | TouchEvent) => void;


export const useOnClickOutside = <T extends HTMLElement = HTMLElement>(ref: RefObject<T | null>, handler: Handler): void => {
    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            if (!ref.current || ref.current.contains(event.target as Node)) {
                return;
            }
            handler(event);
        };

        document.addEventListener("mousedown", listener);
        document.addEventListener("touchstart", listener, {passive: true});

        return () => {
            document.removeEventListener("mousedown", listener);
            document.removeEventListener("touchstart", listener);
        };
    }, [ref, handler]);
};
