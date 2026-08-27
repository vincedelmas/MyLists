import {useEffect, useState} from "react";
import {useRouter} from "@tanstack/react-router";
import {ArrowLeft, ArrowRight} from "lucide-react";
import {Button} from "@/lib/client/components/ui/button";


interface HistoryPosition {
    current: number;
    furthest: number;
}


export const PwaNavControls = () => {
    const router = useRouter();

    const [isIosStandalone] = useState(() => {
        const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
            || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
        const isStandalone = window.matchMedia("(display-mode: standalone)").matches
            || (navigator as Navigator & { standalone?: boolean }).standalone;

        return isIos && isStandalone;
    });

    const [historyPosition, setHistoryPosition] = useState<HistoryPosition>(() => {
        const current = router.history.location.state.__TSR_index;
        return { current, furthest: current };
    });

    useEffect(() => {
        return router.history.subscribe(({ location, action }) => {
            const current = location.state.__TSR_index;

            setHistoryPosition((prev) => ({
                current,
                furthest: action.type === "PUSH" ? current : Math.max(prev.furthest, current),
            }));
        });
    }, [router.history]);

    if (!isIosStandalone) return null;

    const canGoBack = historyPosition.current > 0;
    const canGoForward = historyPosition.current < historyPosition.furthest;

    return (
        <nav
            aria-label="Page history"
            style={{ bottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
            className="fixed left-1/2 z-40 flex -translate-x-1/2 items-center gap-0.5 rounded-full border
            border-border/80 bg-background/80 p-1 shadow-lg shadow-black/25 backdrop-blur-xl"
        >
            <Button
                size="icon-lg"
                variant="ghost"
                aria-label="Go back"
                disabled={!canGoBack}
                onClick={() => router.history.back()}
                className="rounded-full text-muted-foreground"
            >
                <ArrowLeft className="size-5"/>
            </Button>

            <div aria-hidden="true" className="h-5 w-px bg-border"/>

            <Button
                size="icon-lg"
                variant="ghost"
                aria-label="Go forward"
                disabled={!canGoForward}
                onClick={() => router.history.forward()}
                className="rounded-full text-muted-foreground"
            >
                <ArrowRight className="size-5"/>
            </Button>
        </nav>
    );
};
