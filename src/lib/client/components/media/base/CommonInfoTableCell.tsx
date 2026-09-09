import React from "react";
import {Heart} from "lucide-react";
import {formatRating} from "@/lib/client/ratings";
import {UserMediaItem} from "@/lib/types/query.options.types";
import {DisplayRating} from "@/lib/client/components/media/base/DisplayRating";
import {DisplayComment} from "@/lib/client/components/media/base/DisplayComment";


export const CommonInfoTableCell = ({ userMedia, ratingDisplay }: { userMedia: UserMediaItem; ratingDisplay?: React.ReactNode }) => {
    const rating = formatRating(userMedia.ratingSystem, userMedia.rating, true);

    return (
        <>
            {ratingDisplay ?? (rating &&
                <DisplayRating
                    rating={rating}
                />
            )}
            {userMedia.favorite &&
                <Heart className="size-4 text-favorite"/>
            }
            {userMedia.comment &&
                <DisplayComment content={userMedia.comment}/>
            }
        </>
    );
}
