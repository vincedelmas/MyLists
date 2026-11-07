import {useNow} from "@/lib/client/hooks/use-dates";
import {zeroPad} from "@/lib/utils/formatting/number";


export const CountdownTimer = () => {
    const now = useNow();
    const nextMidnight = new Date(now).setUTCHours(24, 0, 0, 0);
    const difference = nextMidnight - now;

    const hours = Math.floor(difference / 3_600_000);
    const minutes = Math.floor(difference / 60_000) % 60;
    const seconds = Math.floor(difference / 1000) % 60;

    return (
        <span className="font-mono font-medium tabular-nums text-brand mt-0.5">
            {zeroPad(hours)}:
            {zeroPad(minutes)}:
            {zeroPad(seconds)}
        </span>
    );
};
