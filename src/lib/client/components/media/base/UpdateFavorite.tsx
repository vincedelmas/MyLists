import {Heart} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {UpdateType} from "@/lib/utils/enums";
import {Button} from "@/lib/client/components/ui/button";
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
        <Button
            type="button"
            size="iconBare"
            variant="invisible"
            onClick={handleFavorite}
            aria-pressed={Boolean(isFavorite)}
            disabled={updateFavorite.isPending || disabled}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
            <Heart
                className={cn(
                    "size-5 opacity-100",
                    isFavorite && "text-red-700",
                    (updateFavorite.isPending || disabled) && "opacity-20",
                )}
            />
        </Button>
    );
};
