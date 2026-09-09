import {cn} from "@/lib/utils/classnames";
import {RatingSystemType} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {formatRating, getFeelingIcon, getFeelingList, getScoreList} from "@/lib/client/ratings";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


interface RatingSelectProps {
    id?: string;
    bulk?: boolean;
    disabled?: boolean;
    className?: string;
    rating: number | null;
    onChange: (rating: number | null) => void;
}


export const RatingSelect = ({ id, rating, onChange, className, disabled = false, bulk = false }: RatingSelectProps) => {
    const { currentUser } = useAuth();
    const system = currentUser!.ratingSystem;

    const choices = system === RatingSystemType.SCORE
        ? getScoreList()
        : getFeelingList({ size: 16 });

    const selected = system === RatingSystemType.SCORE
        ? rating
        : getFeelingIcon(rating, { labelOnly: true });

    const items = choices.map(choice => ({
        label: choice.value,
        value: choice.label ?? DEFAULT_DASH_FALLBACK,
    }));

    if (system === RatingSystemType.SCORE && rating !== null && !items.some(item => item.value === String(rating))) {
        items.push({ value: String(rating), label: String(rating) });
    }

    return (
        <Select
            disabled={disabled}
            value={bulk ? "average" : selected?.toString() ?? DEFAULT_DASH_FALLBACK}
            items={bulk ? [{ value: "average", label: formatRating(system, rating) }, ...items] : items}
            onValueChange={value => {
                if (value !== null) {
                    onChange(value === DEFAULT_DASH_FALLBACK ? null : Number(value));
                }
            }}
        >
            <SelectTrigger
                id={id}
                size="sm"
                title={bulk ? "Set all current seasons" : undefined}
                className={cn("w-27 rounded-r-none!", className)}
            >
                <SelectValue>
                    {formatRating(system, rating)}
                </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-75 overflow-y-auto scrollbar-thin">
                <SelectGroup>
                    {items.map(item =>
                        <SelectItem key={item.value} value={item.value}>
                            {item.label}
                        </SelectItem>)
                    }
                </SelectGroup>
            </SelectContent>
        </Select>
    );
};
