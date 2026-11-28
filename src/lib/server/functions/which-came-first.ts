import {createServerFn} from "@tanstack/react-start";
import {AchievementCategory} from "@/lib/utils/enums";
import {getContainer} from "@/lib/server/core/container";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {abandonWhichCameFirstRunSchema, answerWhichCameFirstRoundSchema, startWhichCameFirstRunSchema} from "@/lib/schemas";


export const getWhichCameFirstGame = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .handler(async ({ context: { currentUser } }) => {
        const whichCameFirstService = await getContainer().then(c => c.services.whichCameFirst);
        return whichCameFirstService.getGameData(currentUser.id);
    });


export const postStartWhichCameFirstRun = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(startWhichCameFirstRunSchema)
    .handler(async ({ data: { mediaTypes }, context: { currentUser } }) => {
        const whichCameFirstService = await getContainer().then(c => c.services.whichCameFirst);
        return whichCameFirstService.startRun(currentUser.id, mediaTypes);
    });


export const postAnswerWhichCameFirstRound = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(answerWhichCameFirstRoundSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const container = await getContainer();
        const result = container.services.whichCameFirst.answerRound(currentUser.id, data.runId, data.roundId, data.selectedSide);

        const categories: AchievementCategory[] = [AchievementCategory.MINIGAMES];
        if (result.runEnded) categories.push(AchievementCategory.SECRETS);
        
        const unlockedAchievements = container.services.achievements.evaluateUserCategories(currentUser.id, categories, ["wcf"]);

        return { ...result, unlockedAchievements };
    });


export const postAbandonWhichCameFirstRun = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(abandonWhichCameFirstRunSchema)
    .handler(async ({ data: { runId }, context: { currentUser } }) => {
        const whichCameFirstService = await getContainer().then(c => c.services.whichCameFirst);
        whichCameFirstService.abandonRun(currentUser.id, runId);

        return { success: true };
    });


export const postResetWhichCameFirstStats = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .handler(async ({ context: { currentUser } }) => {
        const whichCameFirstService = await getContainer().then(c => c.services.whichCameFirst);
        whichCameFirstService.resetStats(currentUser.id);

        return { success: true };
    });
