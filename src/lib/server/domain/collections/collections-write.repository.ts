import {and, eq, inArray, max, sql} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {
    collection,
    collectionItem,
    collectionLike,
    catalogItem,
} from "@/lib/server/database/schema";
import {MediaType, PrivacyType} from "@/lib/utils/enums";


export type CollectionItemSnapshot = {
    mediaId: number;
    orderIndex: number;
    annotation: string | null;
    createdAt: string;
};


export class CollectionsWriteRepository {
    createCollection(params: {
        ownerId: number;
        title: string;
        description?: string | null;
        kind: MediaType;
        visibility: PrivacyType;
        ordered: boolean;
    }) {
        return getDbClient().insert(collection).values(params).returning({ id: collection.id }).get();
    }

    updateCollection(collectionId: number, values: {
        title: string;
        description?: string | null;
        visibility: PrivacyType;
        ordered: boolean;
    }) {
        return getDbClient().update(collection).set({
            ...values,
            updatedAt: sql`CURRENT_TIMESTAMP`,
        }).where(eq(collection.id, collectionId));
    }

    async replaceItems(collectionId: number, kind: MediaType, items: Array<{ mediaId: number; annotation?: string | null }>) {
        const mapped = await this.resolveItems(kind, items.map((item, index) => ({
            ...item,
            annotation: item.annotation ?? null,
            orderIndex: index + 1,
            createdAt: new Date().toISOString(),
        })));
        await getDbClient().delete(collectionItem).where(eq(collectionItem.collectionId, collectionId));
        if (mapped.length) {
            await getDbClient().insert(collectionItem).values(mapped.map((item) => ({
                collectionId,
                catalogItemId: item.catalogItemId,
                position: item.orderIndex,
                annotation: item.annotation,
                createdAt: item.createdAt,
            })));
        }
    }

    async addItem(collectionId: number, kind: MediaType, mediaId: number) {
        const [mapped] = await this.resolveItems(kind, [{ mediaId, annotation: null, orderIndex: 1, createdAt: new Date().toISOString() }]);
        const position = (await getDbClient().select({ value: max(collectionItem.position) })
            .from(collectionItem).where(eq(collectionItem.collectionId, collectionId)).get())?.value ?? 0;
        await getDbClient().insert(collectionItem).values({
            collectionId,
            catalogItemId: mapped.catalogItemId,
            position: position + 1,
        }).onConflictDoNothing();
    }

    async removeItem(collectionId: number, kind: MediaType, mediaId: number) {
        const [mapped] = await this.resolveItems(kind, [{ mediaId, annotation: null, orderIndex: 1, createdAt: new Date().toISOString() }]);
        await getDbClient().delete(collectionItem).where(and(
            eq(collectionItem.collectionId, collectionId),
            eq(collectionItem.catalogItemId, mapped.catalogItemId),
        ));
    }

    async toggleLike(collectionId: number, userId: number) {
        const existing = await getDbClient().select().from(collectionLike).where(and(
            eq(collectionLike.collectionId, collectionId),
            eq(collectionLike.userId, userId),
        )).get();
        if (existing) {
            await getDbClient().delete(collectionLike).where(and(
                eq(collectionLike.collectionId, collectionId),
                eq(collectionLike.userId, userId),
            ));
            return false;
        }
        await getDbClient().insert(collectionLike).values({ collectionId, userId });
        return true;
    }

    incrementCopyCount(collectionId: number) {
        return getDbClient().update(collection).set({
            copiedCount: sql`${collection.copiedCount} + 1`,
        }).where(eq(collection.id, collectionId));
    }

    incrementViewCount(collectionId: number) {
        return getDbClient().update(collection).set({
            viewCount: sql`${collection.viewCount} + 1`,
        }).where(eq(collection.id, collectionId));
    }

    async deleteCollection(collectionId: number) {
        await getDbClient().delete(collection).where(eq(collection.id, collectionId));
    }

    private async resolveItems(kind: MediaType, items: CollectionItemSnapshot[]) {
        if (items.length === 0) return [];
        const catalogItems = await getDbClient().select({ id: catalogItem.id })
            .from(catalogItem).where(and(
            eq(catalogItem.kind, kind),
            inArray(catalogItem.id, items.map(({ mediaId }) => mediaId)),
        ));
        const validIds = new Set(catalogItems.map(({ id }) => id));
        return items.map((item) => {
            if (!validIds.has(item.mediaId)) throw new Error(`Catalog item is missing for ${kind}:${item.mediaId}.`);
            return { ...item, catalogItemId: item.mediaId };
        });
    }
}
