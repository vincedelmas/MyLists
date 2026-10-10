import {FormattedError} from "@/lib/utils/error-classes";
import {dynamicLists, user, userMediaSettings} from "@/lib/server/database/schema";
import {and, asc, desc, eq, isNotNull} from "drizzle-orm";
import type {DynamicListSpec} from "@/lib/schemas/dynamic-lists.schema";
import {getDbClient} from "@/lib/server/database/async-storage";


const selection = {
    id: dynamicLists.id,
    spec: dynamicLists.spec,
    createdAt: dynamicLists.createdAt,
    updatedAt: dynamicLists.updatedAt,
    profilePosition: dynamicLists.profilePosition,
};


export const dynamicListsRepository = {
    getOwner(id: number) {
        const owner = getDbClient()
            .select({
                id: user.id,
                username: user.name,
                privacy: user.privacy,
            })
            .from(dynamicLists)
            .innerJoin(user, eq(user.id, dynamicLists.userId))
            .where(eq(dynamicLists.id, id))
            .get();

        if (!owner) {
            throw new FormattedError("Dynamic list not found.");
        }

        return {
            ...owner,
            activeMediaTypes: getDbClient()
                .select({ mediaType: userMediaSettings.mediaType })
                .from(userMediaSettings)
                .where(and(eq(userMediaSettings.userId, owner.id), eq(userMediaSettings.active, true)))
                .all().map(setting => setting.mediaType),
        };
    },

    getAll(userId: number) {
        return getDbClient()
            .select(selection)
            .from(dynamicLists)
            .where(eq(dynamicLists.userId, userId))
            .orderBy(desc(dynamicLists.createdAt), desc(dynamicLists.id))
            .all();
    },

    get(userId: number, id: number) {
        const view = getDbClient()
            .select(selection)
            .from(dynamicLists)
            .where(and(eq(dynamicLists.userId, userId), eq(dynamicLists.id, id)))
            .get();

        if (!view) {
            throw new FormattedError("Dynamic list not found.");
        }

        return view;
    },

    create(userId: number, spec: DynamicListSpec) {
        return getDbClient()
            .insert(dynamicLists)
            .values({ userId, spec })
            .returning({ id: dynamicLists.id })
            .get();
    },

    update(userId: number, id: number, spec: DynamicListSpec) {
        const result = getDbClient()
            .update(dynamicLists)
            .set({
                spec,
                updatedAt: new Date().toISOString(),
            })
            .where(and(eq(dynamicLists.userId, userId), eq(dynamicLists.id, id)))
            .returning({ id: dynamicLists.id })
            .get();

        if (!result) {
            throw new FormattedError("Dynamic list not found.");
        }

        return result;
    },

    delete(userId: number, id: number) {
        const result = getDbClient()
            .delete(dynamicLists)
            .where(and(eq(dynamicLists.userId, userId), eq(dynamicLists.id, id)))
            .returning({ id: dynamicLists.id })
            .get();

        if (!result) {
            throw new FormattedError("Dynamic list not found.");
        }
    },

    getPinned(userId: number) {
        return getDbClient()
            .select(selection)
            .from(dynamicLists)
            .where(and(eq(dynamicLists.userId, userId), isNotNull(dynamicLists.profilePosition)))
            .orderBy(asc(dynamicLists.profilePosition))
            .all();
    },
};
