import {UpdateType} from "@/lib/utils/enums";
import {RatingSelect} from "@/lib/client/components/media/base/RatingSelect";
import {MediaSaveFeedback} from "@/lib/client/components/media/base/MediaSaveFeedback";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";

interface RatingComponentProps {
    disabled?: boolean;
    rating: number | null;
    onUpdateMutation: ReturnType<typeof useUpdateUserMediaMutation>;
}

export const UpdateRating = ({ rating, onUpdateMutation, disabled = false }: RatingComponentProps) => (
    <MediaSaveFeedback mutation={onUpdateMutation} field="rating" disabled={disabled}>
        {saveDisabled => (
            <RatingSelect
                rating={rating}
                disabled={saveDisabled}
                className="w-34 rounded-r-md!"
                onChange={rating => onUpdateMutation.mutate({ payload: { rating, type: UpdateType.RATING } })}
            />
        )}
    </MediaSaveFeedback>
);
