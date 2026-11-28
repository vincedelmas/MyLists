import {createServerFn} from "@tanstack/react-start";
import {AchievementCategory} from "@/lib/utils/enums";
import {getContainer} from "@/lib/server/core/container";
import {createBookSchema, updateUserBookDetailsSchema} from "@/lib/schemas/books.schema";
import {requiredMediaWriteMiddleware} from "@/lib/server/middlewares/media-authentication";


export const postCreateBook = createServerFn({ method: "POST" })
    .middleware([requiredMediaWriteMiddleware])
    .validator(createBookSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        const result = await container.services.mediaTracking.createManualBook(currentUser.id, data);
        const unlockedAchievements = container.services.achievements.evaluateUserCategories(currentUser.id, [
            AchievementCategory.BOOKS,
            AchievementCategory.GENERAL,
            AchievementCategory.SECRETS,
        ], ["status", "book-details"]);

        return { ...result, unlockedAchievements };
    });


export const postUpdateUserBookDetails = createServerFn({ method: "POST" })
    .middleware([requiredMediaWriteMiddleware])
    .validator(updateUserBookDetailsSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        const result = container.services.mediaTracking.updateUserBookCustomDetails(currentUser.id, data);
        const unlockedAchievements = container.services.achievements.evaluateUserCategories(currentUser.id, [
            AchievementCategory.BOOKS,
            AchievementCategory.GENERAL,
            AchievementCategory.SECRETS,
        ], ["book-details"]);

        return { ...result, unlockedAchievements };
    });
