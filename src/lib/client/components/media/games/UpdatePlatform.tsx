import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {GamesPlatformsEnum, UpdateType} from "@/lib/utils/enums";
import {gameCompatiblePlatformsOptions} from "@/lib/client/react-query/query-options";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";


interface UpdatePlatformProps {
    disabled?: boolean;
    mediaId: number;
    platform: GamesPlatformsEnum | null;
    updatePlatform: ReturnType<typeof useUpdateUserMediaMutation>;
}


export const UpdatePlatform = ({ platform, mediaId, updatePlatform, disabled = false }: UpdatePlatformProps) => {
    const [open, setOpen] = useState(false);
    const { data, isLoading } = useQuery(gameCompatiblePlatformsOptions(mediaId, open));

    const compatiblePlatforms = data?.map((p) => p.name) ?? [];
    const availablePlatforms = compatiblePlatforms.length > 0 ? compatiblePlatforms : isLoading ? [] : Object.values(GamesPlatformsEnum);

    const selectedPlatformIsMissing = platform && !availablePlatforms.includes(platform);
    const allPlatforms = [DEFAULT_DASH_FALLBACK, ...(selectedPlatformIsMissing ? [platform] : []), ...availablePlatforms];

    const handleSelect = (value: string) => {
        if (disabled) return;
        const valueToSend = value === DEFAULT_DASH_FALLBACK ? null : value as GamesPlatformsEnum;
        updatePlatform.mutate({ payload: { platform: valueToSend, type: UpdateType.PLATFORM } });
    };

    return (
        <div className="flex justify-between items-center">
            <div>Platform</div>
            <Select
                open={open}
                onOpenChange={setOpen}
                onValueChange={handleSelect}
                disabled={updatePlatform.isPending || disabled}
                value={platform?.toString() ?? DEFAULT_DASH_FALLBACK}
            >
                <SelectTrigger size="sm" className="w-34">
                    <SelectValue/>
                </SelectTrigger>
                <SelectContent className="max-h-73 overflow-y-auto scrollbar-thin">
                    {isLoading &&
                        <SelectItem value="__loading" disabled>
                            Loading...
                        </SelectItem>
                    }
                    {allPlatforms.map((platform) =>
                        <SelectItem key={platform} value={platform}>
                            {platform}
                        </SelectItem>
                    )}
                </SelectContent>
            </Select>
        </div>
    );
};
