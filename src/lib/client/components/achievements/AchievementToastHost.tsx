import {X} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {useEffect, useRef, useState} from "react";
import {useNavigate} from "@tanstack/react-router";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {formatPercent} from "@/lib/utils/formatting/number";
import {getAchievementRarityTier} from "@/lib/utils/achievements";
import type {UnlockedAchievementToast} from "@/lib/types/achievements.types";
import {AchievementBadge} from "@/lib/client/components/achievements/AchievementBadge";
import {subscribeAchievementToasts} from "@/lib/client/achievements/achievement-toasts";


type QueuedToast = {
    key: string;
    item: UnlockedAchievementToast;
};


const TOAST_DURATION_MS = 5500;
let sharedAudioContext: AudioContext | null = null;


const playAchievementUnlockSound = (isSpecial: boolean) => {
    if (typeof window === "undefined") return;

    try {
        const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;

        if (!sharedAudioContext) sharedAudioContext = new AudioCtx();
        const ctx = sharedAudioContext;

        const playNotes = () => {
            const now = ctx.currentTime;
            const filter = ctx.createBiquadFilter();

            filter.type = "lowpass";
            filter.connect(ctx.destination);
            filter.frequency.setValueAtTime(3600, now);

            const notes = isSpecial
                ? [
                    { freq: 587.33, offset: 0, duration: 0.42, peak: 0.09 },
                    { freq: 739.99, offset: 0.075, duration: 0.45, peak: 0.095 },
                    { freq: 880.0, offset: 0.15, duration: 0.55, peak: 0.105 },
                    { freq: 1318.51, offset: 0.23, duration: 0.78, peak: 0.11 },
                ]
                : [
                    { freq: 659.25, offset: 0, duration: 0.36, peak: 0.095 },
                    { freq: 987.77, offset: 0.095, duration: 0.58, peak: 0.11 },
                ];

            for (const note of notes) {
                const gain = ctx.createGain();
                const start = now + note.offset;

                gain.gain.setValueAtTime(0.0001, start);
                gain.gain.linearRampToValueAtTime(note.peak, start + 0.014);
                gain.gain.exponentialRampToValueAtTime(0.0001, start + note.duration);

                gain.connect(filter);
                const fundamental = ctx.createOscillator();

                fundamental.type = "sine";
                fundamental.frequency.setValueAtTime(note.freq, start);

                fundamental.connect(gain);
                fundamental.start(start);
                fundamental.stop(start + note.duration + 0.02);

                const overtoneGain = ctx.createGain();
                overtoneGain.gain.setValueAtTime(0.0001, start);
                overtoneGain.gain.linearRampToValueAtTime(note.peak * 0.22, start + 0.012);
                overtoneGain.gain.exponentialRampToValueAtTime(0.0001, start + note.duration * 0.7);

                overtoneGain.connect(filter);
                const overtone = ctx.createOscillator();

                overtone.type = "triangle";
                overtone.frequency.setValueAtTime(note.freq * 2, start);

                overtone.connect(overtoneGain);
                overtone.start(start);
                overtone.stop(start + note.duration + 0.02);
            }
        };

        if (ctx.state === "suspended") {
            void ctx.resume().then(playNotes).catch(() => {
            });
        }
        else {
            playNotes();
        }
    }
    catch {
        // Ignore audio playback errors when blocked by browser autoplay policy
    }
};


export function AchievementToastHost() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const startedAtRef = useRef<number>(0);
    const remainingMsRef = useRef(TOAST_DURATION_MS);
    const [queue, setQueue] = useState<QueuedToast[]>([]);
    const [paused, setPaused] = useState(false);
    const lastKeyRef = useRef<string | null>(null);

    const current = queue[0] ?? null;
    const currentKey = current?.key ?? null;
    const queuedCount = Math.max(0, queue.length - 1);

    const currentTier = current ? getAchievementRarityTier(current.item.rarity) : "common";
    const isSpecialSound = Boolean(current && (current.item.secret || currentTier === "rare" || currentTier === "ultra"));

    useEffect(() => {
        return subscribeAchievementToasts((items) => {
            const nextEntries = items.map((item) => ({
                item,
                key: `${item.codeName}-${Date.now()}-${Math.random()}`,
            }));
            setQueue((prev) => [...prev, ...nextEntries]);
        });
    }, []);

    useEffect(() => {
        if (!currentKey) {
            lastKeyRef.current = null;
            return;
        }

        if (lastKeyRef.current !== currentKey) {
            lastKeyRef.current = currentKey;
            remainingMsRef.current = TOAST_DURATION_MS;
            playAchievementUnlockSound(isSpecialSound);
        }

        if (paused) return;

        startedAtRef.current = Date.now();
        const timer = setTimeout(() => {
            setQueue((prev) => prev.slice(1));
        }, remainingMsRef.current);

        return () => {
            clearTimeout(timer);
            const elapsed = Date.now() - startedAtRef.current;
            remainingMsRef.current = Math.max(250, remainingMsRef.current - elapsed);
        };
    }, [currentKey, paused, isSpecialSound]);

    if (!current) return null;

    const { item } = current;
    const isRare = currentTier === "rare";
    const isUltra = currentTier === "ultra";
    const hasRarity = item.rarity !== null && item.rarity > 0;

    const eyebrow = item.secret
        ? `Secret unlocked${hasRarity ? ` · ${formatPercent(item.rarity)}` : ""}`
        : isUltra && hasRarity
            ? `Ultra rare · ${formatPercent(item.rarity)}`
            : isRare && hasRarity
                ? `Rare achievement · ${formatPercent(item.rarity)}`
                : "Achievement unlocked";

    const dismissCurrent = () => {
        setPaused(false);
        setQueue((prev) => prev.slice(1));
    };

    const handleOpen = () => {
        if (!currentUser) return;
        dismissCurrent();

        void navigate({
            hash: `ach-${item.codeName}`,
            to: "/achievements/$username",
            search: { activeTab: item.category },
            params: { username: currentUser.name },
        });
    };

    return (
        <div aria-live="polite" className="pointer-events-none fixed inset-x-4 top-18 z-50 mx-auto w-auto max-w-md">
            <div
                key={current.key}
                onClick={handleOpen}
                tabIndex={currentUser ? 0 : undefined}
                role={currentUser ? "button" : "status"}
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
                onKeyDown={(ev) => {
                    if (currentUser && (ev.key === "Enter" || ev.key === " ")) {
                        ev.preventDefault();
                        handleOpen();
                    }
                }}
                className={cn("group/ach-toast pointer-events-auto relative flex items-center gap-3.5 overflow-hidden rounded-xl " +
                    "border bg-card/95 p-3.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-3 duration-300",
                    currentUser && "cursor-pointer",
                    isUltra && "achievement-shimmer-live achievement-shimmer-ultra border-platinum/65 shadow-[0_12px_32px_-12px_rgba(186,230,253,0.42)]",
                    isRare && "achievement-shimmer-live border-gold/60 shadow-[0_12px_32px_-12px_rgba(234,185,73,0.45)]",
                    !isRare && !isUltra && "border-brand/45 shadow-[0_12px_28px_-12px_rgba(0,0,0,0.75)]",
                )}
            >
                <AchievementBadge
                    size="sm"
                    unlocked={true}
                    icon={item.icon}
                    shape={item.shape}
                    rarity={item.rarity}
                    pattern={item.pattern}
                    category={item.category}
                />

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className={cn("truncate text-[10px] font-bold uppercase tracking-[0.14em]",
                            isUltra ? "text-platinum" : isRare ? "text-gold" : "text-brand")}
                        >
                            {eyebrow}
                        </span>
                        {queuedCount > 0 &&
                            <span className="shrink-0 rounded-full border border-border bg-muted px-1.5 py-px text-[10px]
                            font-semibold tabular-nums text-muted-foreground">
                                +{queuedCount}
                            </span>
                        }
                    </div>
                    <div className="mt-0.5 truncate text-sm font-semibold text-foreground">
                        {item.name}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {item.metadata?.label ? `${item.metadata.label} · ${item.description}` : item.description}
                    </p>
                </div>

                <button
                    type="button"
                    aria-label="Dismiss achievement notification"
                    className="shrink-0 self-start rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={(ev) => {
                        ev.stopPropagation();
                        dismissCurrent();
                    }}
                >
                    <X className="size-3.5"/>
                </button>

                <div
                    style={{ "--toast-duration": `${TOAST_DURATION_MS}ms` } as React.CSSProperties}
                    className={cn("animate-achievement-timer absolute inset-x-0 bottom-0 h-0.5 group-hover/ach-toast:paused",
                        isUltra ? "bg-platinum" : isRare ? "bg-gold" : "bg-brand",
                    )}
                />
            </div>
        </div>
    );
}
