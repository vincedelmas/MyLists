import NProgress from "nprogress";
import {useEffect, useRef} from "react";
import {useRouterState} from "@tanstack/react-router";


NProgress.configure({ showSpinner: false, parent: "body" });


interface ProgressOpts {
    pendingMs?: number;
    pendingMinMs?: number;
}


export const useNProgress = ({ pendingMs = 80, pendingMinMs = 200 }: ProgressOpts = {}) => {
    const startedAtRef = useRef<number | undefined>(undefined);
    const minTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const showTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const isPending = useRouterState({ select: (state) => state.status === "pending" });

    useEffect(() => {
        const clearShowTimer = () => {
            clearTimeout(showTimerRef.current);
            showTimerRef.current = undefined;
        };

        const clearMinTimer = () => {
            clearTimeout(minTimerRef.current);
            minTimerRef.current = undefined;
        };

        const complete = () => {
            clearShowTimer();

            if (!startedAtRef.current) return;

            const elapsed = Date.now() - startedAtRef.current;
            const remaining = Math.max(pendingMinMs - elapsed, 0);

            if (remaining > 0) {
                clearMinTimer();
                minTimerRef.current = setTimeout(() => {
                    NProgress.done();
                    startedAtRef.current = undefined;
                    minTimerRef.current = undefined;
                }, remaining);
            }
            else {
                NProgress.done();
                startedAtRef.current = undefined;
            }
        };

        if (isPending) {
            clearMinTimer();
            if (startedAtRef.current) return;

            showTimerRef.current = setTimeout(() => {
                NProgress.start();
                startedAtRef.current = Date.now();
            }, pendingMs);
        }
        else {
            complete();
        }

        return () => {
            clearShowTimer();
        };
    }, [isPending, pendingMs, pendingMinMs]);

    useEffect(() => {
        return () => {
            clearTimeout(showTimerRef.current);
            clearTimeout(minTimerRef.current);
            NProgress.done();
        };
    }, []);

    return null;
};
