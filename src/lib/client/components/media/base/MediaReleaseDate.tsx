import {extractYear, formatDate} from "@/lib/utils/date-formatting";


interface MediaReleaseDateProps {
    precision?: "date" | "year";
    date: string | number | undefined | null;
}


export const MediaReleaseDate = ({ date, precision = "date" }: MediaReleaseDateProps) => {
    if (precision === "year") {
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
