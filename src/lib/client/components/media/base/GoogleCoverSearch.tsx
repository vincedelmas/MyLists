import {Search} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import type {MediaType} from "@/lib/utils/enums";
import {Badge} from "@/lib/client/components/ui/badge";
import {Button} from "@/lib/client/components/ui/button";
import {useEffect, useEffectEvent, useRef, useState} from "react";


interface GoogleCoverSearchProps {
    mediaId: number;
    mediaName: string;
    enabled?: boolean;
    disabled?: boolean;
    className?: string;
    mediaType: MediaType;
    authors?: string | null;
    size?: "default" | "lg";
    onUseCover: (url: string) => void;
}


export function GoogleCoverSearch(props: GoogleCoverSearchProps) {
    const {
        mediaId, mediaType, mediaName, authors, disabled = false, enabled = true,
        size = "default", className, onUseCover
    } = props;

    const [status, setStatus] = useState("");
    const requestId = useRef<string | null>(null);
    const [connected, setConnected] = useState(false);

    const mediaKey = `${mediaType}:${mediaId}`;

    const receive = useEffectEvent((event: MessageEvent) => {
        if (
            event.source !== window
            || event.origin !== window.location.origin
            || event.data?.source !== "mylists-cover-picker-extension"
        ) {
            return;
        }

        const data = event.data;
        if (data.type === "ready") {
            setConnected(true);
        }

        if (!requestId.current || data.requestId !== requestId.current) return;
        if (data.type === "search-result") {
            setStatus(data.ok ? "Right-click a large image and choose ‘Use as MyLists cover’." : data.error);
        }

        if (data.type !== "cover") return;
        let error: string | undefined;

        if (data.mediaKey !== mediaKey) {
            error = "This search belongs to another media item. Start a new search.";
        }
        else if (disabled) {
            error = "Wait for the current save or refresh to finish, then choose the image again.";
        }
        else if (
            typeof data.imageUrl !== "string" || !URL.canParse(data.imageUrl)
            || !["http:", "https:"].includes(new URL(data.imageUrl).protocol)
        ) {
            error = "Choose an image with an HTTP or HTTPS address.";
        }

        if (!error) onUseCover(data.imageUrl);
        setStatus(error ?? "Cover address added. Review the cover, then save.");

        window.postMessage({
            error,
            ok: !error,
            type: "cover-result",
            requestId: data.requestId,
            source: "mylists-cover-picker-app",
        }, window.location.origin);
    });

    useEffect(() => {
        if (!enabled) return;

        const listener = (event: MessageEvent) => receive(event);

        window.addEventListener("message", listener);
        window.postMessage({ source: "mylists-cover-picker-app", type: "ping" }, window.location.origin);

        return () => {
            requestId.current = null;
            window.removeEventListener("message", listener);
        };
    }, [enabled, mediaKey]);

    return (
        <div className={cn("flex min-w-0 flex-col gap-2", className)}>
            <Button
                size={size}
                type="button"
                variant="outline"
                className="justify-start"
                disabled={disabled || !enabled}
                onClick={() => {
                    const query = [mediaName, authors, mediaType === "books" ? "book" : mediaType, "cover"]
                        .filter(Boolean).join(" ");

                    if (!connected) {
                        const url = new URL("https://www.google.com/search");
                        url.searchParams.set("tbm", "isch");
                        url.searchParams.set("q", query);
                        window.open(url.href, "_blank", "noopener,noreferrer");
                        return;
                    }

                    requestId.current = crypto.randomUUID();
                    setStatus("Opening Google Images…");

                    window.postMessage({
                        query,
                        mediaKey,
                        type: "search",
                        requestId: requestId.current,
                        source: "mylists-cover-picker-app",
                    }, window.location.origin);
                }}
            >
                <Search data-icon="inline-start"/>
                Search Google Images
            </Button>

            {connected &&
                <Badge variant="success">
                    Cover picker connected.
                </Badge>
            }

            <p role="status" className="text-sm text-muted-foreground empty:hidden">
                {status}
            </p>
        </div>
    );
}
