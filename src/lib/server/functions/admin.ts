import {z} from "zod";
import {auth} from "@/lib/server/core/auth";
import {createServerFn} from "@tanstack/react-start";
import {RateLimiterRes} from "rate-limiter-flexible";
import {runTask} from "@/lib/server/tasks/task-runner";
import {getContainer} from "@/lib/server/core/container";
import {FormattedError} from "@/lib/utils/error-classes";
import {deleteCookie} from "@tanstack/react-start/server";
import {setSignedCookie} from "@/lib/utils/signed-cookies";
import {getAllTasksMetadata, getTask} from "@/lib/server/tasks/registry";
import {listAdminLogFiles, readAdminLogFile} from "@/lib/server/core/admin-logs-reader";
import {requiredAuthAndAdminRoleMiddleware, requiredAuthAndAdminTokenMiddleware} from "@/lib/server/middlewares/authentication";
import {adminAuthRateLimiter, clearAdminCookie, isAdminAuthenticated, setAdminCookie, verifyAdminPassword} from "@/lib/utils/admin-utils";
import {
    adminApiMonitoringSchema,
    adminDeleteArchivedTaskSchema,
    adminPostUpdateTiersSchema,
    adminPostUpdateUserSchema,
    adminRefreshSchema,
    adminTriggerTaskSchema,
    adminUpdateAchievementSchema,
    adminUpdateYearRecapReleaseSchema,
    searchTypeSchema
} from "@/lib/schemas";


export const checkAdminAuth = createServerFn({ method: "GET" })
    .middleware([requiredAuthAndAdminRoleMiddleware])
    .handler(async ({ context: { currentUser } }) => {
        return isAdminAuthenticated(currentUser.id);
    });


export const adminAuth = createServerFn({ method: "POST" })
    .middleware([requiredAuthAndAdminRoleMiddleware])
    .validator(z.object({ password: z.string() }))
    .handler(async ({ data: { password }, context: { currentUser } }) => {
        const limiter = await adminAuthRateLimiter;

        try {
            await limiter.consume(String(currentUser.id));
        }
        catch (error) {
            if (!(error instanceof RateLimiterRes)) throw error;
            return {
                success: false,
                message: "Too many attempts. Please try again later.",
            };
        }

        const isValidPassword = await verifyAdminPassword(password);
        if (!isValidPassword) {
            return {
                success: false,
                message: "Invalid Password",
            };
        }

        await limiter.delete(String(currentUser.id));
        await setAdminCookie(currentUser.id);

        return { success: true };
    });


export const getAdminOverview = createServerFn({ method: "GET" })
    .middleware([requiredAuthAndAdminTokenMiddleware])
    .handler(async () => {
        const accountService = await getContainer().then((c) => c.services.account);
        return accountService.getUserOverviewForAdmin();
    });


export const postAdminUpdateYearRecapRelease = createServerFn({ method: "POST" })
    .middleware([requiredAuthAndAdminTokenMiddleware])
    .validator(adminUpdateYearRecapReleaseSchema)
    .handler(async ({ data: { year, mode } }) => {
        const adminService = await getContainer().then((container) => container.services.admin);
        return adminService.updateYearRecapReleaseMode(year, mode);
    });


export const getAdminYearRecapReleases = createServerFn({ method: "GET" })
    .middleware([requiredAuthAndAdminTokenMiddleware])
    .handler(async () => {
        const adminService = await getContainer().then((container) => container.services.admin);
        return adminService.getYearRecapReleases();
    });


export const getAdminMediaOverview = createServerFn({ method: "GET" })
    .middleware([requiredAuthAndAdminTokenMiddleware])
    .handler(async () => {
        const adminService = await getContainer().then((c) => c.services.admin);
        const mediaServiceRegistry = await getContainer().then((c) => c.registries.mediaService);

        return adminService.getMediaOverviewForAdmin(mediaServiceRegistry);
    });


export const getAdminCollectionsOverview = createServerFn({ method: "GET" })
    .middleware([requiredAuthAndAdminTokenMiddleware])
    .handler(async () => {
        const adminService = await getContainer().then((c) => c.services.admin);
        return adminService.getCollectionsOverviewForAdmin();
    });


export const getAdminAllCollections = createServerFn({ method: "GET" })
    .middleware([requiredAuthAndAdminTokenMiddleware])
    .validator(searchTypeSchema)
    .handler(async ({ data }) => {
        const adminService = await getContainer().then((c) => c.services.admin);
        return adminService.getPaginatedCollectionsForAdmin(data);
    });


export const getAdminAllUsers = createServerFn({ method: "GET" })
    .middleware([requiredAuthAndAdminTokenMiddleware])
    .validator(searchTypeSchema)
    .handler(async ({ data }) => {
        const accountService = await getContainer().then((c) => c.services.account);
        return accountService.getPaginatedUsersForAdmin(data);
    });


export const getAdminInactiveAccountDeletions = createServerFn({ method: "GET" })
    .middleware([requiredAuthAndAdminTokenMiddleware])
    .validator(searchTypeSchema)
    .handler(async ({ data }) => {
        const inactiveAccountService = await getContainer().then((c) => c.services.inactiveAccount);
        return inactiveAccountService.getAdminOverview(data);
    });


export const getAdminAchievements = createServerFn({ method: "GET" })
    .middleware([requiredAuthAndAdminTokenMiddleware])
    .handler(async () => {
        const achievementService = await getContainer().then((c) => c.services.achievements);
        return achievementService.getAllAchievements();
    });


export const getAdminMediadleStats = createServerFn({ method: "GET" })
    .middleware([requiredAuthAndAdminTokenMiddleware])
    .validator(searchTypeSchema)
    .handler(async ({ data }) => {
        const mediadleService = await getContainer().then((c) => c.services.mediadle);
        return mediadleService.getAllUsersStatsForAdmin(data);
    });


export const getAdminWhichCameFirstStats = createServerFn({ method: "GET" })
    .middleware([requiredAuthAndAdminTokenMiddleware])
    .handler(async () => {
        const whichCameFirstService = await getContainer().then((c) => c.services.whichCameFirst);
        return whichCameFirstService.getAdminStats();
    });


export const postAdminUpdateUser = createServerFn({ method: "POST" })
    .middleware([requiredAuthAndAdminTokenMiddleware])
    .validator(adminPostUpdateUserSchema)
    .handler(async ({ data: { userId, payload } }) => {
        const accountService = await getContainer().then((c) => c.services.account);
        return accountService.updateUserForAdmin(userId, payload);
    });


export const postAdminUpdateAchievement = createServerFn({ method: "POST" })
    .middleware([requiredAuthAndAdminTokenMiddleware])
    .validator(adminUpdateAchievementSchema)
    .handler(async ({ data: { achievementId, name, description } }) => {
        const achievementService = await getContainer().then((c) => c.services.achievements);
        return achievementService.updateAchievementForAdmin(achievementId, name, description);
    });


export const postAdminUpdateTiers = createServerFn({ method: "POST" })
    .middleware([requiredAuthAndAdminTokenMiddleware])
    .validator(adminPostUpdateTiersSchema)
    .handler(async ({ data: { tiers } }) => {
        const achievementService = await getContainer().then((c) => c.services.achievements);
        return achievementService.updateTiersForAdmin(tiers);
    });


export const getAdminTasks = createServerFn({ method: "GET" })
    .middleware([requiredAuthAndAdminTokenMiddleware])
    .handler(async () => getAllTasksMetadata());


export const postAdminTriggerTask = createServerFn({ method: "POST" })
    .middleware([requiredAuthAndAdminTokenMiddleware])
    .validator(adminTriggerTaskSchema)
    .handler(async ({ data: { taskName, input } }) => {
        const task = getTask(taskName);
        if (!task) throw new FormattedError(`Task ${taskName} not found.`);

        const result = task.inputSchema.parse(input);

        await runTask({
            taskName: task.name,
            input: result as any,
            triggeredBy: "dashboard",
        });
    });


export const getAdminArchivedTasks = createServerFn({ method: "GET" })
    .middleware([requiredAuthAndAdminTokenMiddleware])
    .handler(async () => {
        const adminService = await getContainer().then((c) => c.services.admin);
        return adminService.getArchivedTasksForAdmin();
    });


export const postAdminDeleteArchivedTask = createServerFn({ method: "POST" })
    .middleware([requiredAuthAndAdminTokenMiddleware])
    .validator(adminDeleteArchivedTaskSchema)
    .handler(async ({ data: { taskId } }) => {
        const adminService = await getContainer().then((c) => c.services.admin);
        return adminService.deleteArchivedTaskForAdmin(taskId);
    });


export const getAdminMediaRefreshStats = createServerFn({ method: "GET" })
    .middleware([requiredAuthAndAdminTokenMiddleware])
    .validator(adminRefreshSchema)
    .handler(async ({ data }) => {
        const adminService = await getContainer().then((c) => c.services.admin);
        return adminService.getMediaRefreshStats(data);
    });


export const getAdminApiMonitoringStats = createServerFn({ method: "GET" })
    .middleware([requiredAuthAndAdminTokenMiddleware])
    .validator(adminApiMonitoringSchema)
    .handler(async ({ data }) => {
        const adminService = await getContainer().then((c) => c.services.admin);
        return adminService.getApiMonitoringStats(data);
    });


export const getAdminAllUpdatesHistory = createServerFn({ method: "GET" })
    .middleware([requiredAuthAndAdminTokenMiddleware])
    .validator(searchTypeSchema)
    .handler(async ({ data }) => {
        const updateHistoryService = await getContainer().then((c) => c.services.updateHistory);
        return updateHistoryService.getUserUpdatesPaginated(data);
    });


export const postImpersonateUser = createServerFn({ method: "POST" })
    .middleware([requiredAuthAndAdminTokenMiddleware])
    .validator(z.object({ userId: z.coerce.number().int().positive() }))
    .handler(async ({ data: { userId } }) => {
        const ctx = await auth.$context;
        const { sessionData, sessionToken } = ctx.authCookies;

        const targetUser = await ctx.internalAdapter.findUserById(String(userId));
        if (!targetUser) throw new FormattedError("User not found");

        // 10 min session
        const newSession = await ctx.internalAdapter.createSession(
            targetUser.id,
            true,
            { expiresAt: new Date(Date.now() + (10 * 60 * 1000)) },
            true,
        );
        if (!newSession) throw new FormattedError("Failed to create session");

        // Delete current user and admin cookie
        clearAdminCookie();

        deleteCookie(sessionData.name, {
            path: sessionData.attributes.path,
            secure: sessionData.attributes.secure,
            domain: sessionData.attributes.domain,
        });

        // 10 min cookie
        await setSignedCookie(sessionToken.name, newSession.token, ctx.secret, 10 * 60);
    });


export const getAdminListLogFiles = createServerFn({ method: "GET" })
    .middleware([requiredAuthAndAdminTokenMiddleware])
    .handler(async () => {
        return listAdminLogFiles();
    });


export const getAdminReadLogFile = createServerFn({ method: "GET" })
    .middleware([requiredAuthAndAdminTokenMiddleware])
    .validator(z.object({ fileName: z.string() }))
    .handler(async ({ data: { fileName } }) => {
        return readAdminLogFile(fileName);
    });
