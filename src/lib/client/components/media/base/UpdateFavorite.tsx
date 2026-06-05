import {Heart} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {UpdateType} from "@/lib/utils/enums";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


interface UpdateFavoriteProps {
    disabled?: boolean;
    isFavorite: boolean | undefined | null;
    updateFavorite: ReturnType<typeof useUpdateUserMediaMutation>;
}


export const UpdateFavorite = ({ updateFavorite, isFavorite, disabled = false }: UpdateFavoriteProps) => {

    const handleFavorite = () => {
        if (disabled) return;
        updateFavorite.mutate({ payload: { favorite: !isFavorite, type: UpdateType.FAVORITE } });
    };

    return (
        <div role="button" onClick={handleFavorite}>
            <Heart
                className={cn(
                    "size-5 opacity-100",
                    isFavorite && "text-red-700",
                    (updateFavorite.isPending || disabled) && "opacity-20",
                )}
            />
        </div>
    );
};
