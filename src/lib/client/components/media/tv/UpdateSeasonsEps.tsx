import {UpdateType} from "@/lib/utils/enums";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


interface UpdateSeasonsEpsProps {
    currentSeason: number,
    currentEpisode: number,
    epsPerSeason: { season: number, episodes: number }[],
    onUpdateMutation: ReturnType<typeof useUpdateUserMediaMutation>,
}


export const UpdateSeasonsEps = ({ onUpdateMutation, epsPerSeason, currentSeason, currentEpisode }: UpdateSeasonsEpsProps) => {
    const episodes = [...Array(epsPerSeason.find(s => s.season === currentSeason)!.episodes).keys()]
        .map(v => (v + 1).toString());

    const seasonItems = [...epsPerSeason]
        .sort((a, b) => a.season - b.season)
        .map((item) => ({ label: String(item.season), value: String(item.season) }));

    const episodeItems = episodes.map((episode) => ({ label: episode, value: episode }));

    const handleSeasonUpdate = (season: string | null) => {
        if (season === null) return;
        onUpdateMutation.mutate({
            payload: {
                type: UpdateType.TV,
                currentSeason: parseInt(season),
            }
        });
    };

    const handleEpisodeUpdate = (episode: string | null) => {
        if (episode === null) return;
        onUpdateMutation.mutate({
            payload: {
                type: UpdateType.TV,
                currentEpisode: parseInt(episode),
            }
        });
    };

    return (
        <>
            <div className="flex justify-between items-center">
                <div>Season</div>
                <Select items={seasonItems} value={currentSeason.toString()} onValueChange={handleSeasonUpdate}
                        disabled={onUpdateMutation.isPending}>
                    <SelectTrigger size="sm" className="w-34" aria-label="Current season">
                        <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            {seasonItems.map((item) =>
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            )}
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex justify-between items-center">
                <div>Episode</div>
                <Select items={episodeItems} value={currentEpisode.toString()} onValueChange={handleEpisodeUpdate}
                        disabled={onUpdateMutation.isPending}>
                    <SelectTrigger size="sm" className="w-34" aria-label="Current episode">
                        <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            {episodeItems.map((item) =>
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            )}
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>
        </>
    );
};
