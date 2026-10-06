import {FormattedError} from "@/lib/utils/error-classes";
import {smartViews, user} from "@/lib/server/database/schema";
import {and, asc, desc, eq, inArray, isNotNull} from "drizzle-orm";
import type {SmartViewSpec} from "@/lib/schemas/smart-views.schema";
import {getDbClient, withTransaction} from "@/lib/server/database/async-storage";


const selection = {
    id: smartViews.id,
    spec: smartViews.spec,
    createdAt: smartViews.createdAt,
    updatedAt: smartViews.updatedAt,
    profilePosition: smartViews.profilePosition,
};


export const smartViewsRepository = {
    getOwner(id: number) {
        const owner = getDbClient()
            .select({
                id: user.id,
                username: user.name,
                privacy: user.privacy,
                profilePosition: smartViews.profilePosition,
            })
            .from(smartViews)
            .innerJoin(user, eq(user.id, smartViews.userId))
            .where(eq(smartViews.id, id))
            .get();

        if (!owner) {
            throw new FormattedError("Smart list not found.");
        }

        return owner;
    },

    getAll(userId: number) {
        return getDbClient()
            .select(selection)
            .from(smartViews)
            .where(eq(smartViews.userId, userId))
            .orderBy(desc(smartViews.createdAt), desc(smartViews.id))
            .all();
    },

    get(userId: number, id: number) {
        const view = getDbClient()
            .select(selection)
            .from(smartViews)
            .where(and(eq(smartViews.userId, userId), eq(smartViews.id, id)))
            .get();

        if (!view) {
            throw new FormattedError("Smart list not found.");
        }

        return view;
    },

    create(userId: number, spec: SmartViewSpec) {
        return getDbClient()
            .insert(smartViews)
            .values({ userId, spec })
            .returning({ id: smartViews.id })
            .get();
    },

    update(userId: number, id: number, spec: SmartViewSpec) {
        const result = getDbClient()
            .update(smartViews)
            .set({
                spec,
                updatedAt: new Date().toISOString(),
            })
            .where(and(eq(smartViews.userId, userId), eq(smartViews.id, id)))
            .returning({ id: smartViews.id })
            .get();

        if (!result) {
            throw new FormattedError("Smart list not found.");
        }

        return result;
    },

    delete(userId: number, id: number) {
        const result = getDbClient()
            .delete(smartViews)
            .where(and(eq(smartViews.userId, userId), eq(smartViews.id, id)))
            .returning({ id: smartViews.id })
            .get();

        if (!result) {
            throw new FormattedError("Smart list not found.");
        }
    },

    getProfileViews(userId: number) {
        return getDbClient()
            .select(selection)
            .from(smartViews)
            .where(and(eq(smartViews.userId, userId), isNotNull(smartViews.profilePosition)))
            .orderBy(asc(smartViews.profilePosition))
            .all();
    },

    setProfileViews(userId: number, ids: number[]) {
        return withTransaction(tx => {
            if (ids.length) {
                const owned = tx
                    .select({ id: smartViews.id })
                    .from(smartViews)
                    .where(and(eq(smartViews.userId, userId), inArray(smartViews.id, ids)))
                    .all();

                if (owned.length !== ids.length) {
                    throw new FormattedError("Choose smart lists from your own library.");
                }
            }

            tx.update(smartViews)
                .set({ profilePosition: null })
                .where(eq(smartViews.userId, userId))
                .run();

            ids.forEach((id, index) => {
                tx.update(smartViews)
                    .set({ profilePosition: index + 1 })
                    .where(and(eq(smartViews.userId, userId), eq(smartViews.id, id)))
                    .run();
            });

            return smartViewsRepository.getProfileViews(userId);
        });
    },
};
