import {UpdateType} from "@/lib/utils/enums";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


interface UpdateSeasonsEpsProps {
    currentSeason: number,
    currentEpisode: number,
    seasons: { seasonNumber: number, episodeCount: number }[],
    onUpdateMutation: ReturnType<typeof useUpdateUserMediaMutation>,
}


export const UpdateSeasonsEps = ({ onUpdateMutation, seasons, currentSeason, currentEpisode }: UpdateSeasonsEpsProps) => {
    const episodeCount = seasons.find(({ seasonNumber }) => seasonNumber === currentSeason)?.episodeCount ?? 0;
    const episodes = [...Array(episodeCount).keys()].map(v => (v + 1).toString());

    const handleSeasonUpdate = (season: string) => {
        onUpdateMutation.mutate({ payload: { currentSeason: parseInt(season), type: UpdateType.TV } });
    };

    const handleEpisodeUpdate = (episode: string) => {
        onUpdateMutation.mutate({ payload: { currentEpisode: parseInt(episode), type: UpdateType.TV } });
    };

    return (
        <>
            <div className="flex justify-between items-center">
                <div>Season</div>
                <Select value={currentSeason.toString()} onValueChange={handleSeasonUpdate}
                        disabled={onUpdateMutation.isPending}>
                    <SelectTrigger size="sm" className="w-34">
                        <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                        {seasons.map((item) =>
                            <SelectItem key={item.seasonNumber} value={item.seasonNumber.toString()}>
                                {item.seasonNumber}
                            </SelectItem>
                        )}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex justify-between items-center">
                <div>Episode</div>
                <Select value={currentEpisode.toString()} onValueChange={handleEpisodeUpdate}
                        disabled={onUpdateMutation.isPending}>
                    <SelectTrigger size="sm" className="w-34">
                        <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                        {episodes.map(episode =>
                            <SelectItem key={episode} value={episode}>
                                {episode}
                            </SelectItem>
                        )}
                    </SelectContent>
                </Select>
            </div>
        </>
    );
};
