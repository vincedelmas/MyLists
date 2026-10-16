import {and, eq, isNotNull} from "drizzle-orm";
import {FormattedError} from "@/lib/utils/error-classes";
import {collections, dynamicLists} from "@/lib/server/database/schema";
import {MAX_PROFILE_PINS, type ProfilePinItem} from "@/lib/schemas/profile-pins.schema";
import {getDbClient, withTransaction} from "@/lib/server/database/async-storage";


const pinSources = {
    dynamic: { table: dynamicLists, ownerId: dynamicLists.userId },
    collection: { table: collections, ownerId: collections.ownerId },
};


export const profilePinsRepository = {
    getOwn(userId: number) {
        return Object.entries(pinSources).flatMap(([kind, { table, ownerId }]) => getDbClient()
            .select({ id: table.id, position: table.profilePosition })
            .from(table)
            .where(and(eq(ownerId, userId), isNotNull(table.profilePosition)))
            .all()
            .map(item => ({ ...item, kind: kind as ProfilePinItem["kind"], position: item.position! })))
            .sort((a, b) => a.position - b.position);
    },

    set(userId: number, item: ProfilePinItem, pinned: boolean) {
        return withTransaction(tx => {
            const { table, ownerId } = pinSources[item.kind];
            const selection = and(eq(ownerId, userId), eq(table.id, item.id));
            const owned = tx.select({ position: table.profilePosition }).from(table).where(selection).get();

            if (!owned) throw new FormattedError("Choose a list or collection you own.");
            if ((owned.position !== null) === pinned) return;

            const pins = profilePinsRepository.getOwn(userId);
            if (pinned && pins.length >= MAX_PROFILE_PINS) {
                throw new FormattedError(`You can pin up to ${MAX_PROFILE_PINS} lists and collections to your profile.`);
            }

            const next = pinned ? [...pins, item] : pins.filter(pin => pin.kind !== item.kind || pin.id !== item.id);

            for (const source of Object.values(pinSources)) {
                tx.update(source.table).set({ profilePosition: null }).where(eq(source.ownerId, userId)).run();
            }

            next.forEach((pin, index) => {
                const source = pinSources[pin.kind];
                tx.update(source.table).set({ profilePosition: index + 1 })
                    .where(and(eq(source.ownerId, userId), eq(source.table.id, pin.id))).run();
            });
        });
    },
};
