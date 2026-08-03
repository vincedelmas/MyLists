import {extractYear, formatDate} from "@/lib/utils/date-formatting";


interface MediaReleaseDateProps {
    density?: "default" | "compact";
    date: string | number | undefined | null;
}


export const MediaReleaseDate = ({ date, density = "default" }: MediaReleaseDateProps) => {
    if (density === "compact") {
        if (typeof date === "number") return null;

        return (
            <span className="tabular-nums">
                {extractYear(date)}
            </span>
        );
    }

    return (
        <span className="tabular-nums">
            {formatDate(date)}
        </span>
    );
};
