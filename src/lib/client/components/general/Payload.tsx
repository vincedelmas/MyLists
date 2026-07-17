import {MoveRight} from "lucide-react";
import {Link} from "@tanstack/react-router";
import {zeroPad} from "@/lib/utils/number-formatting";
import {MediaType, UpdateType} from "@/lib/utils/enums";
import {UserUpdateType} from "@/lib/types/query.options.types";


interface PayloadProps {
    update: UserUpdateType;
    username?: string | null;
}


export const Payload = ({ update, username }: PayloadProps) => {
    const { payload, mediaType, updateType } = update;
    if (!payload) return null;

    const { oldValue, newValue } = payload;

    switch (updateType) {
        case UpdateType.STATUS:
            return (
                <PayloadLayout
                    oldVal={formatChangeValue(oldValue)}
                    newVal={formatChangeValue(newValue)}
                    username={username}
                />
            );

        case UpdateType.TV:
            if (!isNumberPair(oldValue) || !isNumberPair(newValue)) return null;
            return (
                <PayloadLayout
                    username={username}
                    oldVal={`S${zeroPad(newValue[0])}.E${zeroPad(oldValue[1])}`}
                    newVal={`S${zeroPad(newValue[0])}.E${zeroPad(newValue[1])}`}
                />
            );

        case UpdateType.REDO: {
            if (typeof oldValue !== "number" || typeof newValue !== "number") return null;
            const name = mediaType === MediaType.BOOKS ? "Re-read" : "Re-watched";
            const suffix = mediaType === MediaType.SERIES || mediaType === MediaType.ANIME ? "x S." : "x";
            return (
                <PayloadLayout
                    username={username}
                    newVal={`${newValue}${suffix}`}
                    oldVal={`${name} ${oldValue}${suffix}`}
                />
            );
        }

        case UpdateType.PLAYTIME:
            if (typeof oldValue !== "number" || typeof newValue !== "number") return null;
            return (
                <PayloadLayout
                    username={username}
                    oldVal={`${oldValue / 60} h`}
                    newVal={`${newValue / 60} h`}
                />
            );

        case UpdateType.PAGE:
            return (
                <PayloadLayout
                    username={username}
                    oldVal={`p. ${oldValue}`}
                    newVal={`p. ${newValue}`}
                />
            );

        case UpdateType.CHAPTER:
            return (
                <PayloadLayout
                    username={username}
                    oldVal={`chpt. ${oldValue}`}
                    newVal={`chpt. ${newValue}`}
                />
            );

        default:
            return null;
    }
};


const isNumberPair = (value: unknown): value is [number, number] =>
    Array.isArray(value) && value.length === 2 && value.every((item) => typeof item === "number");

const formatChangeValue = (value: unknown): React.ReactNode => {
    if (value === null || typeof value === "string" || typeof value === "number") return value;
    if (typeof value === "boolean") return String(value);
    return JSON.stringify(value);
};


interface PayloadLayoutProps {
    newVal: React.ReactNode;
    oldVal?: React.ReactNode;
    username?: string | null;
}


const PayloadLayout = ({ oldVal, newVal, username }: PayloadLayoutProps) => {
    return (
        <>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold">
                {oldVal &&
                    <span className="text-muted-foreground">
                        {oldVal}
                    </span>
                }
                {oldVal &&
                    <MoveRight className="size-4 text-app-accent"/>
                }
                <span className="text-primary/95">
                    {newVal}
                </span>
            </div>
            {username &&
                <Link to="/profile/$username" params={{ username }}>
                    <div className="text-xs font-semibold text-app-accent">
                        {username}{"  "}
                    </div>
                </Link>
            }
        </>
    );
}
