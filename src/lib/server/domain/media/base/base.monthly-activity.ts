import {inArray, sql} from "drizzle-orm";
import {DeltaStats} from "@/lib/types/stats.types";
import {Status, UpdateType} from "@/lib/utils/enums";
import {AnySQLiteColumn} from "drizzle-orm/sqlite-core";
import {getDbClient} from "@/lib/server/database/async-storage";
import {BaseRepository} from "@/lib/server/domain/media/base/base.repository";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {AnyServerMediaDefinition} from "@/lib/media-definitions/base/media.definition.server";


type Contributions = {
    mediaId: number;
    progressGained: number
}[];


export type MonthlyActivityMedia = {
    id: number;
    name: string;
    imageCover: string;
    duration: number | null;
};


type CreateMonthlyActivityOptions = {
    repository: BaseRepository<any, any>;
    definition: AnyServerMediaDefinition;
    progressFromDelta?: (delta: DeltaStats) => number;
    durationColumn?: AnySQLiteColumn<{ data: number, notNull: true }>;
};


const progressDefault = (delta: DeltaStats) => delta.totalSpecific ?? 0;


export const createMediaMonthlyActivity = ({ definition, repository, durationColumn, progressFromDelta = progressDefault }: CreateMonthlyActivityOptions) => {
    const mediaType = definition.identity.mediaType;
    const progressDefinition = getMediaDefinition(mediaType).progress;
    const timing = progressDefinition.timing;

    function progressToMinutes(progressGained: number, duration?: number | null) {
        switch (timing.kind) {
            case "fixed":
                return progressGained * timing.minutesPerUnit;
            case "media-duration":
                return progressGained * (duration ?? timing.fallbackMinutes);
            case "stored-minutes":
                return progressGained;
        }
    }

    return {
        mediaType,

        progressToMinutes,

        async getMediaByIds(mediaIds: number[]): Promise<MonthlyActivityMedia[]> {
            const { mediaTable } = definition.repository.tables;

            const uniqueMediaIds = [...new Set(mediaIds)];
            if (uniqueMediaIds.length === 0) {
                return [];
            }

            return getDbClient()
                .select({
                    id: mediaTable.id,
                    name: mediaTable.name,
                    imageCover: mediaTable.imageCover,
                    duration: durationColumn ? durationColumn : sql<null>`NULL`,
                })
                .from(mediaTable)
                .where(inArray(mediaTable.id, uniqueMediaIds));
        },

        async hasUserMedia(userId: number, mediaId: number) {
            const [media, userMedia] = await Promise.all([
                repository.findById(mediaId),
                repository.findUserMedia(userId, mediaId),
            ]);

            return {
                mediaExists: !!media,
                inUserList: !!userMedia,
            };
        },

        searchUserMedia(userId: number, search: string, limit = 20) {
            return repository.searchUserListByName(userId, search, limit);
        },

        createContribution(delta: DeltaStats, updateType: UpdateType) {
            return {
                progressGained: Math.max(0, progressFromDelta(delta)),
                redoGained: updateType === "redo" ? Math.max(0, delta.totalRedo ?? 0) : 0,
                hadCompletion: updateType === "status" && (delta.statusCounts?.[Status.COMPLETED] ?? 0) > 0,
            };
        },

        summarize(contributions: Contributions, mediaById: Map<number, Pick<MonthlyActivityMedia, "duration">>) {
            return contributions.reduce((summary, contribution) => {
                const media = mediaById.get(contribution.mediaId);
                if (!media) return summary;

                summary.count += 1;
                summary.progressTotal += contribution.progressGained;
                summary.timeGained += progressToMinutes(contribution.progressGained, media.duration);

                return summary;
            }, { count: 0, timeGained: 0, progressTotal: 0 });
        },
    };
};


export type MediaMonthlyActivity = ReturnType<typeof createMediaMonthlyActivity>;
