import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {transactionMiddleware} from "@/lib/server/middlewares/transaction";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {abandonWhichCameFirstRunSchema, answerWhichCameFirstRoundSchema, startWhichCameFirstRunSchema} from "@/lib/schemas";


export const getWhichCameFirstGame = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .handler(async ({ context: { currentUser } }) => {
        const whichCameFirstService = await getContainer().then(c => c.services.whichCameFirst);
        return whichCameFirstService.getGameData(currentUser.id);
    });


export const postStartWhichCameFirstRun = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(startWhichCameFirstRunSchema)
    .handler(async ({ data: { mediaTypes }, context: { currentUser } }) => {
        const whichCameFirstService = await getContainer().then(c => c.services.whichCameFirst);
        return whichCameFirstService.startRun(currentUser.id, mediaTypes);
    });


export const postAnswerWhichCameFirstRound = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(answerWhichCameFirstRoundSchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const whichCameFirstService = await getContainer().then(c => c.services.whichCameFirst);
        return whichCameFirstService.answerRound(currentUser.id, data.runId, data.roundId, data.selectedSide);
    });


export const postAbandonWhichCameFirstRun = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(abandonWhichCameFirstRunSchema)
    .handler(async ({ data: { runId }, context: { currentUser } }) => {
        const whichCameFirstService = await getContainer().then(c => c.services.whichCameFirst);
        await whichCameFirstService.abandonRun(currentUser.id, runId);

        return { success: true };
    });


export const postResetWhichCameFirstStats = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .handler(async ({ context: { currentUser } }) => {
        const whichCameFirstService = await getContainer().then(c => c.services.whichCameFirst);
        await whichCameFirstService.resetStats(currentUser.id);

        return { success: true };
    });
