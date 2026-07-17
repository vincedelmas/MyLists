import {user} from "@/lib/server/database/schema";
import {CacheManager} from "@/lib/server/core/cache-manager";
import {GeneralSettings} from "@/lib/schemas";
import {ValidationError} from "@/lib/utils/error-classes";
import {UserRepository} from "@/lib/server/domain/user/user.repository";


const LAST_SEEN_CACHE_KEY = "lastSeen";
const UPDATE_THRESHOLD_MS = 5 * 60 * 1000;


export class AccountSettingsCommands {
    constructor(private readonly repository = UserRepository) {}

    async update(userId: number, payload: Partial<typeof user.$inferInsert>) {
        try {
            await this.repository.updateUserSettings(userId, payload);
        }
        catch (error) {
            if (payload.name && isUsernameConstraintError(error)) {
                throw new ValidationError<GeneralSettings>("username", "Invalid username. Please select another one.");
            }
            throw error;
        }
    }

    updateShowOnboarding(userId: number) {
        return this.repository.updateShowOnboarding(userId);
    }

    updateFeatureFlag(userId: number) {
        return this.repository.updateFeatureFlag(userId);
    }

    async recordLastSeen(cacheManager: CacheManager, userId: number) {
        const cacheKey = `${LAST_SEEN_CACHE_KEY}:${userId}`;
        if (await cacheManager.get(cacheKey)) return;
        await cacheManager.set(cacheKey, true, UPDATE_THRESHOLD_MS);
        return this.repository.updateUserLastSeen(userId);
    }
}


const isUsernameConstraintError = (error: unknown) => error instanceof Error
    && error.message.includes("UNIQUE constraint failed: user.name");
