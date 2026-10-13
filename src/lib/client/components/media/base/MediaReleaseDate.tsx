import {extractYear, formatDate, formatDateForDb} from "@/lib/utils/formatting/date";


interface MediaReleaseDateProps {
    precision?: "date" | "year";
    date: string | number | undefined | null;
}


export const MediaReleaseDate = ({ date, precision = "date" }: MediaReleaseDateProps) => {
    if (precision === "year") {
        return (
            <span className="tabular-nums">
                {extractYear(typeof date === "number" ? formatDateForDb(date) : date)}
            </span>
        );
    }

    return (
        <span className="tabular-nums">
            {formatDate(date)}
        </span>
    );
};
