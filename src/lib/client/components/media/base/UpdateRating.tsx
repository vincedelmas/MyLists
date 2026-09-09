import {UpdateType} from "@/lib/utils/enums";
import {RatingSelect} from "@/lib/client/components/media/base/RatingSelect";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";

interface RatingComponentProps {
    disabled?: boolean;
    rating: number | null;
    onUpdateMutation: ReturnType<typeof useUpdateUserMediaMutation>;
}

export const UpdateRating = ({ rating, onUpdateMutation, disabled = false }: RatingComponentProps) => (
    <RatingSelect
        rating={rating}
        className="w-34"
        disabled={disabled || onUpdateMutation.isPending}
        onChange={rating => onUpdateMutation.mutate({ payload: { rating, type: UpdateType.RATING } })}
    />
);
