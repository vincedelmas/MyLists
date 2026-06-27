import {useAuth} from "@/lib/client/hooks/use-auth";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {RatingSystemType, UpdateType} from "@/lib/utils/enums";
import {getFeelingIcon, getFeelingList, getScoreList} from "@/lib/utils/ratings-formatting";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


interface RatingComponentProps {
    disabled?: boolean;
    rating: number | null;
    onUpdateMutation: ReturnType<typeof useUpdateUserMediaMutation>;
}


export const UpdateRating = ({ rating, onUpdateMutation, disabled = false }: RatingComponentProps) => {
    const { currentUser } = useAuth();
    const ratingList = (currentUser?.ratingSystem === RatingSystemType.SCORE) ? getScoreList() : getFeelingList({ size: 16 });
    const ratingValue = (currentUser?.ratingSystem === RatingSystemType.SCORE) ? rating : getFeelingIcon(rating, { labelOnly: true });

    const handleSelectChange = (value: string) => {
        if (disabled) return;
        const valueToSend = value === DEFAULT_DASH_FALLBACK ? null : Number(value);
        onUpdateMutation.mutate({ payload: { rating: valueToSend, type: UpdateType.RATING } });
    };

    return (
        <div className="flex justify-between items-center">
            <Select
                value={ratingValue?.toString() ?? DEFAULT_DASH_FALLBACK}
                onValueChange={handleSelectChange} disabled={onUpdateMutation?.isPending || disabled}
            >
                <SelectTrigger size="sm" className="w-34">
                    <SelectValue/>
                </SelectTrigger>
                <SelectContent className="max-h-75 overflow-y-auto">
                    {ratingList.map((rating) =>
                        <SelectItem key={rating.label} value={rating.label ?? DEFAULT_DASH_FALLBACK}>
                            {rating.value}
                        </SelectItem>
                    )}
                </SelectContent>
            </Select>
        </div>
    );
};
