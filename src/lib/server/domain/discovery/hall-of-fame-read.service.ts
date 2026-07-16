import {HallOfFameSearch} from "@/lib/schemas";
import {MediaType} from "@/lib/utils/enums";
import {HallOfFameRepository} from "@/lib/server/domain/discovery/hall-of-fame.repository";


export class HallOfFameReadService {
    constructor(private readonly repository = HallOfFameRepository) {}

    async getHallOfFame(filters: HallOfFameSearch, userId?: number) {
        const data = await this.repository.getRankingData(filters, userId);
        const userRanks = data.mediaTypes.map((mediaType) => {
            const rank = Number(data.currentUserRankData?.[`${mediaType}Rank` as keyof typeof data.currentUserRankData]) || null;
            const activeUserCount = data.mediaTypeCountMap.get(mediaType) ?? 0;
            const active = data.currentUserActiveSettings.has(mediaType);
            let percent: number | null = null;

            if (rank !== null && active) {
                if (activeUserCount === 1 && rank === 1) percent = 100;
                else if (activeUserCount > 1 && rank <= activeUserCount) percent = (rank / activeUserCount) * 100;
            }

            return { rank, active, mediaType, percent };
        });

        const items = data.rankedUsers.map((row) => ({
            id: row.id,
            name: row.name,
            image: row.image,
            privacy: row.privacy,
            totalTime: row.totalTime,
            settings: data.userSettingsMap.get(row.id) ?? [],
            rank: Number(row[data.rankSelectionColName as keyof typeof row]) || null,
        }));

        return {
            items,
            page: data.page,
            pages: data.pages,
            total: data.total,
            userRanks: userRanks as Array<{
                rank: number | null;
                active: boolean;
                mediaType: MediaType;
                percent: number | null;
            }>,
        };
    }
}
