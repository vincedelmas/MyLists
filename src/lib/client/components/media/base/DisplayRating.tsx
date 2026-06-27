import React from "react";
import {Star} from "lucide-react";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";


interface DisplayRatingProps {
    size?: number;
    rating: string | React.ReactNode;
}


export const DisplayRating = ({ rating, size = 15 }: DisplayRatingProps) => {
    if (rating === DEFAULT_DASH_FALLBACK) return null;

    return (
        <div className="flex items-center gap-x-1">
            <Star
                size={size}
                className="text-app-rating"
            />
            <span>{rating}</span>
        </div>
    );
};
