import React from "react";
import {Heart} from "lucide-react";
import {UserMediaItem} from "@/lib/types/query.options.types";
import {DisplayRating} from "@/lib/client/components/media/base/DisplayRating";
import {DisplayComment} from "@/lib/client/components/media/base/DisplayComment";
import {formatRating} from "@/lib/utils/ratings-formatting";


export const CommonInfoTableCell = ({ userMedia }: { userMedia: UserMediaItem }) => {
    const rating = formatRating(userMedia.ratingSystem, userMedia.rating, true);

    return (
        <>
            {rating &&
                <DisplayRating
                    rating={rating}
                />
            }
            {userMedia.favorite &&
                <Heart className="w-4 h-4 text-red-500"/>
            }
            {userMedia.comment &&
                <DisplayComment content={userMedia.comment}/>
            }
        </>
    );
}
