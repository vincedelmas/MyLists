import {and, eq, inArray, max, sql} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {
    editorialCollection,
    editorialCollectionItem,
    editorialCollectionLike,
    catalogItem,
} from "@/lib/server/database/schema";
import {MediaType, PrivacyType} from "@/lib/utils/enums";


export type CollectionItemSnapshot = {
    mediaId: number;
    orderIndex: number;
    annotation: string | null;
    createdAt: string;
};


export class EditorialCollectionsWriteRepository {
    createCollection(params: {
        ownerId: number;
        title: string;
        description?: string | null;
        kind: MediaType;
        visibility: PrivacyType;
        ordered: boolean;
    }) {
        return getDbClient().insert(editorialCollection).values(params).returning({ id: editorialCollection.id }).get();
    }

    updateCollection(collectionId: number, values: {
        title: string;
        description?: string | null;
        visibility: PrivacyType;
        ordered: boolean;
    }) {
        return getDbClient().update(editorialCollection).set({
            ...values,
            updatedAt: sql`CURRENT_TIMESTAMP`,
        }).where(eq(editorialCollection.id, collectionId));
    }

    async replaceItems(collectionId: number, kind: MediaType, items: Array<{ mediaId: number; annotation?: string | null }>) {
        const mapped = await this.resolveItems(kind, items.map((item, index) => ({
            ...item,
            annotation: item.annotation ?? null,
            orderIndex: index + 1,
            createdAt: new Date().toISOString(),
        })));
        await getDbClient().delete(editorialCollectionItem).where(eq(editorialCollectionItem.collectionId, collectionId));
        if (mapped.length) {
            await getDbClient().insert(editorialCollectionItem).values(mapped.map((item) => ({
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
        const position = (await getDbClient().select({ value: max(editorialCollectionItem.position) })
            .from(editorialCollectionItem).where(eq(editorialCollectionItem.collectionId, collectionId)).get())?.value ?? 0;
        await getDbClient().insert(editorialCollectionItem).values({
            collectionId,
            catalogItemId: mapped.catalogItemId,
            position: position + 1,
        }).onConflictDoNothing();
    }

    async removeItem(collectionId: number, kind: MediaType, mediaId: number) {
        const [mapped] = await this.resolveItems(kind, [{ mediaId, annotation: null, orderIndex: 1, createdAt: new Date().toISOString() }]);
        await getDbClient().delete(editorialCollectionItem).where(and(
            eq(editorialCollectionItem.collectionId, collectionId),
            eq(editorialCollectionItem.catalogItemId, mapped.catalogItemId),
        ));
    }

    async toggleLike(collectionId: number, userId: number) {
        const existing = await getDbClient().select().from(editorialCollectionLike).where(and(
            eq(editorialCollectionLike.collectionId, collectionId),
            eq(editorialCollectionLike.userId, userId),
        )).get();
        if (existing) {
            await getDbClient().delete(editorialCollectionLike).where(and(
                eq(editorialCollectionLike.collectionId, collectionId),
                eq(editorialCollectionLike.userId, userId),
            ));
            return false;
        }
        await getDbClient().insert(editorialCollectionLike).values({ collectionId, userId });
        return true;
    }

    incrementCopyCount(collectionId: number) {
        return getDbClient().update(editorialCollection).set({
            copiedCount: sql`${editorialCollection.copiedCount} + 1`,
        }).where(eq(editorialCollection.id, collectionId));
    }

    incrementViewCount(collectionId: number) {
        return getDbClient().update(editorialCollection).set({
            viewCount: sql`${editorialCollection.viewCount} + 1`,
        }).where(eq(editorialCollection.id, collectionId));
    }

    async deleteCollection(collectionId: number) {
        await getDbClient().delete(editorialCollection).where(eq(editorialCollection.id, collectionId));
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
