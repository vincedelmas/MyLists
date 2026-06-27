import {RatingSystemType} from "@/lib/utils/enums";
import {formatNumber} from "@/lib/utils/number-formatting";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {FaAngry, FaFrown, FaGrinAlt, FaGrinStars, FaPoop, FaSmile} from "react-icons/fa";


export const formatRating = (system: RatingSystemType, rating: number | null, returnNull: boolean = false) => {
    if (system === RatingSystemType.FEELING) {
        return getFeelingIcon(rating, { size: 17 });
    }

    if (returnNull) {
        return rating === null ? null : formatNumber(rating, { fractionDigits: 1, locale: "en" });
    }

    return formatNumber(rating, { fractionDigits: 1, locale: "en" });
}


export const getScoreList = () => {
    const STEP = 0.5;
    const MIN_SCORE = 0;
    const MAX_SCORE = 10;

    const scores = Array.from({ length: (MAX_SCORE - MIN_SCORE) / STEP + 1 }, (_, i) => MIN_SCORE + i * STEP);

    return [
        { label: null, value: DEFAULT_DASH_FALLBACK },
        ...scores.map((label) => ({
            label: label.toString(),
            value: label === MAX_SCORE ? label.toString() : formatNumber(label, { fractionDigits: 1, locale: "en" })
        }))
    ];
};


export const getFeelingList = ({ className, size = 20 }: { className?: string, size?: number }) => {
    return [
        { label: null, value: <span>-</span> },
        { label: "0", value: <FaPoop className={className} color="saddlebrown" size={size}/> },
        { label: "2", value: <FaAngry className={className} color="indianred" size={size}/> },
        { label: "4", value: <FaFrown className={className} color="#d0a141" size={size}/> },
        { label: "6", value: <FaSmile className={className} color="darkseagreen" size={size}/> },
        { label: "8", value: <FaGrinAlt className={className} color="#59a643" size={size}/> },
        { label: "10", value: <FaGrinStars className={className} color="#019101" size={size}/> },
    ];
};


export const formatAvgRating = (ratingSystem: RatingSystemType, value: number | null) => {
    if (ratingSystem === RatingSystemType.FEELING) {
        return getFeelingIcon(value, { size: 30 });
    }

    return formatNumber(value, { fractionDigits: 2, locale: "en" });
};


interface GetFeelingIcon {
    size?: number;
    className?: string;
    labelOnly?: boolean;
}


export const getFeelingIcon = (value: number | null, { className, size, labelOnly }: GetFeelingIcon = {}) => {
    if (value === null || !Number.isFinite(value) || value < 0 || value > 10) return DEFAULT_DASH_FALLBACK;

    const feelingList = getFeelingList({ className, size }).slice(1);

    let closest = feelingList[0];
    let smallestDelta = Math.abs(value - Number(feelingList[0].label));
    for (const mood of feelingList) {
        const delta = Math.abs(value - Number(mood.label));
        if (delta < smallestDelta || (delta === smallestDelta && Number(mood.label) < Number(closest.label))) {
            closest = mood;
            smallestDelta = delta;
        }
    }

    if (labelOnly) return closest.label;

    return closest.value;
};
