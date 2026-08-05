import {useAuth} from "@/lib/client/hooks/use-auth";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {RatingSystemType, UpdateType} from "@/lib/utils/enums";
import {getFeelingIcon, getFeelingList, getScoreList} from "@/lib/utils/ratings-formatting";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


interface RatingComponentProps {
    disabled?: boolean;
    rating: number | null;
    onUpdateMutation: ReturnType<typeof useUpdateUserMediaMutation>;
}


export const UpdateRating = ({ rating, onUpdateMutation, disabled = false }: RatingComponentProps) => {
    const { currentUser } = useAuth();
    const ratingList = (currentUser?.ratingSystem === RatingSystemType.SCORE) ? getScoreList() : getFeelingList({ size: 16 });
    const ratingItems = ratingList.map((rating) => ({
        label: rating.value,
        value: rating.label ?? DEFAULT_DASH_FALLBACK,
    }));
    const ratingValue = (currentUser?.ratingSystem === RatingSystemType.SCORE) ? rating : getFeelingIcon(rating, { labelOnly: true });

    const handleSelectChange = (value: string | null) => {
        if (value === null || disabled) return;
        const valueToSend = value === DEFAULT_DASH_FALLBACK ? null : Number(value);
        onUpdateMutation.mutate({ payload: { rating: valueToSend, type: UpdateType.RATING } });
    };

    return (
        <div className="flex justify-between items-center">
            <Select
                items={ratingItems}
                value={ratingValue?.toString() ?? DEFAULT_DASH_FALLBACK}
                onValueChange={handleSelectChange} disabled={onUpdateMutation?.isPending || disabled}
            >
                <SelectTrigger size="sm" className="w-34">
                    <SelectValue/>
                </SelectTrigger>
                <SelectContent className="max-h-75 overflow-y-auto scrollbar-thin">
                    <SelectGroup>
                        {ratingItems.map((item) =>
                            <SelectItem key={item.value} value={item.value}>
                                {item.label}
                            </SelectItem>
                        )}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </div>
    );
};
