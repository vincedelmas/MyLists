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

    const oldValue = payload.old_value;
    const newValue = payload.new_value;

    switch (updateType) {
        case UpdateType.STATUS:
            return (
                <PayloadLayout
                    oldVal={oldValue}
                    newVal={newValue}
                    username={username}
                />
            );

        case UpdateType.TV:
            return (
                <PayloadLayout
                    username={username}
                    oldVal={`S${zeroPad(newValue[0])}.E${zeroPad(oldValue[1])}`}
                    newVal={`S${zeroPad(newValue[0])}.E${zeroPad(newValue[1])}`}
                />
            );

        case UpdateType.REDO: {
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
