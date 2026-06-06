import React from "react";
import {Heart} from "lucide-react";
import {cn} from "@/lib/utils/classnames";


interface DisplayFavoriteProps {
    size?: number;
    isFavorite: boolean;
}


export const DisplayFavorite = ({ isFavorite, size = 15 }: DisplayFavoriteProps) => {
    return (
        <Heart
            size={size}
            className={cn("", isFavorite && "text-red-700")}
        />
    );
};
