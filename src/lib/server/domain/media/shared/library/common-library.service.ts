import {SimpleSearch} from "@/lib/schemas";
import {CoverType} from "@/lib/types/media-common.types";
import {FormattedError} from "@/lib/utils/error-classes";
import {Status, TagAction, UpdateType} from "@/lib/utils/enums";
import {UpdateUserCustomCover} from "@/lib/contracts/media/library";
import {monthBucketFromDateInput} from "@/lib/utils/date-formatting";
import {saveImageFromUrl, saveUploadedImage} from "@/lib/utils/image-saver";
import {LibraryChangeValue} from "@/lib/server/database/schema/library.schema";
import {MediaListAccessScope} from "@/lib/server/domain/access/library-access.policy";
import {CommonLibraryFields, CommonLibraryRepository} from "@/lib/server/domain/media/shared/library/common-library.repository";


export type LibraryStatsSnapshot = {
    userId: number;
    status: Status;
    time: number;
    redo: number;
    rated: number;
    rating: number;
    specific: number;
    commented: number;
    favorited: number;
};

export type LibraryActivityContribution = {
    redo: boolean;
    completed: boolean;
    unitsGained: number;
};


/** Temporary class-based common library used by media types not migrated to factories yet. */
export class CommonLibraryService {
    constructor(private readonly repository: CommonLibraryRepository) {
    }

    getUserMediaHistory(userId: number, catalogItemId: number) {
        return this.repository.getUserMediaHistory(userId, catalogItemId);
    }

    getListHeader(userId: number) {
        return this.repository.getListHeader(userId);
    }

    getTagsView(access: MediaListAccessScope, search: SimpleSearch) {
        return this.repository.getTagsView(access.ownerId, search);
    }

    getTagNames(userId: number) {
        return this.repository.getTagNames(userId);
    }

    synchronizeProfileChannel(params: { userId: number; enabled: boolean; views: number }) {
        return this.repository.synchronizeProfileChannel(params.userId, params.enabled, params.views);
    }

    async editTag(params: {
        userId: number;
        mediaId?: number;
        action: TagAction;
        tag: { name: string; oldName?: string };
    }) {
        const libraryEntryId = params.mediaId
            ? (await this.repository.findEntry(params.userId, params.mediaId))?.id
            : undefined;
        return this.repository.editTag({
            libraryEntryId,
            userId: params.userId,
            action: params.action,
            name: params.tag.name,
            oldName: params.tag.oldName,
        });
    }

    updateRating(params: { userId: number; catalogItemId: number; rating: number | null }) {
        if (params.rating !== null && (params.rating < 0 || params.rating > 10)) {
            throw new FormattedError("Rating must be between 0 and 10.");
        }
        return this.updateFields(params, { rating: params.rating });
    }

    updateComment(params: { userId: number; catalogItemId: number; comment: string | null }) {
        return this.updateFields(params, { comment: params.comment });
    }

    updateFavorite(params: { userId: number; catalogItemId: number; favorite: boolean }) {
        return this.updateFields(params, { favorite: params.favorite });
    }

    async updateCustomCover(userId: number, input: UpdateUserCustomCover) {
        const current = await this.requireEntry(userId, input.mediaId);
        const customCover = await this.prepareCustomCover(input);
        return this.updateExistingEntry(current, { customCover });
    }

    async recordCreatedEntry(params: {
        entryId: number;
        snapshot: LibraryStatsSnapshot;
        activity: LibraryActivityContribution;
        silent?: boolean;
    }) {
        await this.applyStatsTransition(undefined, params.snapshot);
        if (params.silent) return;
        await this.repository.recordChange(params.entryId, UpdateType.STATUS, null, params.snapshot.status);
        await this.recordActivity(params.entryId, params.activity);
    }

    async recordEntryTransition(params: {
        entryId: number;
        before: LibraryStatsSnapshot;
        after: LibraryStatsSnapshot;
        activity: LibraryActivityContribution;
        updateType: UpdateType;
        oldValue: LibraryChangeValue;
        newValue: LibraryChangeValue;
        loggedAt?: string;
    }) {
        await this.applyStatsTransition(params.before, params.after);
        await this.recordActivity(params.entryId, params.activity, params.loggedAt);
        await this.repository.recordChange(
            params.entryId,
            params.updateType,
            params.oldValue,
            params.newValue,
            params.loggedAt,
        );
    }

    async removeEntry(entryId: number, snapshot: LibraryStatsSnapshot) {
        await this.applyStatsTransition(snapshot, undefined);
        await this.repository.removeEntry(entryId);
    }

    async applyStatsTransition(before?: LibraryStatsSnapshot, after?: LibraryStatsSnapshot) {
        const sample = after ?? before;
        if (!sample) return;
        const current = await this.repository.getStats(sample.userId);
        const beforeMetrics = before ?? emptySnapshot(sample.userId, sample.status);
        const afterMetrics = after ?? emptySnapshot(sample.userId, sample.status);
        const statusCounts = { ...(current?.statusCounts ?? {}) };
        if (before) statusCounts[before.status] = Math.max(0, (statusCounts[before.status] ?? 0) - 1);
        if (after) statusCounts[after.status] = (statusCounts[after.status] ?? 0) + 1;
        const entriesRated = Math.max(0, (current?.entriesRated ?? 0) + afterMetrics.rated - beforeMetrics.rated);
        const ratingSum = Math.max(0, (current?.ratingSum ?? 0) + afterMetrics.rating - beforeMetrics.rating);
        await this.repository.saveStats({
            ratingSum,
            statusCounts,
            entriesRated,
            kind: this.repository.kind,
            userId: sample.userId,
            averageRating: entriesRated > 0 ? ratingSum / entriesRated : null,
            totalRedo: Math.max(0, (current?.totalRedo ?? 0) + afterMetrics.redo - beforeMetrics.redo),
            totalEntries: Math.max(0, (current?.totalEntries ?? 0) + Number(!!after) - Number(!!before)),
            timeSpentMinutes: Math.max(0, (current?.timeSpentMinutes ?? 0) + afterMetrics.time - beforeMetrics.time),
            totalSpecific: Math.max(0, (current?.totalSpecific ?? 0) + afterMetrics.specific - beforeMetrics.specific),
            entriesCommented: Math.max(0, (current?.entriesCommented ?? 0) + afterMetrics.commented - beforeMetrics.commented),
            entriesFavorited: Math.max(0, (current?.entriesFavorited ?? 0) + afterMetrics.favorited - beforeMetrics.favorited),
        });
    }

    private async requireEntry(userId: number, catalogItemId: number) {
        const entry = await this.repository.findEntry(userId, catalogItemId);
        if (!entry) throw new FormattedError("Media not in your list");
        return entry;
    }

    private async updateFields(
        params: { userId: number; catalogItemId: number },
        fields: CommonLibraryFields,
    ) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        return this.updateExistingEntry(current, fields);
    }

    private async updateExistingEntry(
        current: NonNullable<Awaited<ReturnType<CommonLibraryRepository["findEntry"]>>>,
        fields: CommonLibraryFields,
    ) {
        await this.repository.updateEntry(current.id, fields);
        const updated = await this.requireEntry(current.userId, current.catalogItemId);
        await this.applyStatsTransition(commonSnapshot(current), commonSnapshot(updated));
        return updated;
    }

    private async recordActivity(
        entryId: number,
        contribution: LibraryActivityContribution,
        loggedAt?: string,
    ) {
        const occurredAt = loggedAt ? `${loggedAt} 12:00:00` : new Date().toISOString();
        await this.repository.recordActivity({
            entryId,
            ...contribution,
            monthBucket: monthBucketFromDateInput(new Date(occurredAt)),
            occurredAt,
        });
    }

    private async prepareCustomCover(input: UpdateUserCustomCover) {
        if (input.remove) return null;
        const dirSaveName: CoverType = `${this.repository.kind}-covers`;
        const customCover = input.imageFile
            ? await saveUploadedImage({ dirSaveName, file: input.imageFile })
            : await saveImageFromUrl({ dirSaveName, imageUrl: input.imageUrl });
        if (!customCover || customCover === "default.jpg") {
            throw new FormattedError("Could not update the custom cover. Please choose another one.");
        }
        return customCover;
    }
}


const commonSnapshot = (entry: NonNullable<Awaited<ReturnType<CommonLibraryRepository["findEntry"]>>>): LibraryStatsSnapshot => ({
    userId: entry.userId,
    status: entry.status,
    time: 0,
    redo: 0,
    specific: 0,
    rated: Number(entry.rating !== null),
    rating: entry.rating ?? 0,
    commented: Number(!!entry.comment),
    favorited: Number(entry.favorite),
});


const emptySnapshot = (userId: number, status: Status): LibraryStatsSnapshot => ({
    userId,
    status,
    time: 0,
    redo: 0,
    rated: 0,
    rating: 0,
    specific: 0,
    commented: 0,
    favorited: 0,
});
