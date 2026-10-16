import {useEffect} from "react";
import NProgress from "nprogress";
import {useRouterState} from "@tanstack/react-router";
import {useDelayedLoading} from "@/lib/client/hooks/use-delayed-loading";


NProgress.configure({ showSpinner: false, parent: "body" });


interface ProgressOpts {
    pendingMs?: number;
    pendingMinMs?: number;
}


export const useNProgress = ({ pendingMs = 80, pendingMinMs = 200 }: ProgressOpts = {}) => {
    const isPending = useRouterState({ select: (state) => state.status === "pending" });
    const isVisible = useDelayedLoading(isPending, pendingMs, pendingMinMs);

    useEffect(() => {
        if (!isVisible) return;

        NProgress.start();
        return () => {
            NProgress.done();
        };
    }, [isVisible]);

    return null;
};
