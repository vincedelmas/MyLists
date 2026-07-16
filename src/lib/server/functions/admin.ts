import {z} from "zod";
import {serverEnv} from "@/env/server";
import {auth} from "@/lib/server/core/auth";
import {createServerFn} from "@tanstack/react-start";
import {runTask} from "@/lib/server/tasks/task-runner";
import {getContainer} from "@/lib/server/core/container";
import {FormattedError} from "@/lib/utils/error-classes";
import {deleteCookie} from "@tanstack/react-start/server";
import {setSignedCookie} from "@/lib/utils/signed-cookies";
import {getAllTasksMetadata, getTask} from "@/lib/server/tasks/registry";
import {listAdminLogFiles, readAdminLogFile} from "@/lib/server/core/admin-logs-reader";
import {ADMIN_COOKIE_NAME, isAdminAuthenticated, setAdminCookie} from "@/lib/utils/admin-token";
import {requiredAuthAndAdminTokenMiddleware, requiredAuthAndManagerRoleMiddleware} from "@/lib/server/middlewares/authentication";
import {
    adminApiMonitoringSchema,
    adminDeleteArchivedTaskSchema,
    adminPostUpdateTiersSchema,
    adminPostUpdateUserSchema,
    adminRefreshSchema,
    adminTriggerTaskSchema,
    adminUpdateAchievementSchema,
    searchTypeSchema
} from "@/lib/schemas";


export const checkAdminAuth = createServerFn({ method: "GET" })
    .middleware([requiredAuthAndManagerRoleMiddleware])
    .handler(async ({ context: { currentUser } }) => {
        return isAdminAuthenticated(currentUser.id);
    });


export const adminAuth = createServerFn({ method: "POST" })
    .middleware([requiredAuthAndManagerRoleMiddleware])
    .validator((data) => z.object({ password: z.string() }).parse(data))
    .handler(async ({ data, context: { currentUser } }) => {
        if (data.password !== serverEnv.ADMIN_PASSWORD) {
            return { success: false, message: "Incorrect Password" };
        }

        await setAdminCookie(currentUser.id);
        return { success: true };
    });


export const getAdminOverview = createServerFn({ method: "GET" })
    .middleware([requiredAuthAndAdminTokenMiddleware])
    .handler(async () => {
        const container = await getContainer();
        const userService = container.services.user;
        return userService.getUserOverviewForAdmin();
    });


export const getAdminMediaOverview = createServerFn({ method: "GET" })
    .middleware([requiredAuthAndAdminTokenMiddleware])
    .handler(async () => {
        const container = await getContainer();
        const adminService = container.services.admin;
        return adminService.getMediaOverviewForAdmin();
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
        const userService = await getContainer().then((c) => c.services.user);
        return userService.getPaginatedUsersForAdmin(data);
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
        const userService = await getContainer().then((c) => c.services.user);
        return userService.updateUserForAdmin(userId, payload);
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
        const userUpdatesService = await getContainer().then((c) => c.services.userUpdates);
        return userUpdatesService.getUserUpdatesPaginated(data);
    });


export const postImpersonateUser = createServerFn({ method: "POST" })
    .middleware([requiredAuthAndAdminTokenMiddleware])
    .validator(z.object({ userId: z.coerce.number().int().positive() }))
    .handler(async ({ data: { userId } }) => {
        const ctx = await auth.$context;
        const prefix = ctx.options?.advanced?.cookiePrefix ?? "better-auth";
        const prePrefix = (process.env.NODE_ENV === "production") ? "__Secure-" : "";
        const cookies = {
            sessionData: `${prePrefix}${prefix}.session_data`,
            sessionToken: `${prePrefix}${prefix}.session_token`,
        };

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
        deleteCookie(ADMIN_COOKIE_NAME);
        deleteCookie(cookies.sessionData);

        // 10 min cookie
        await setSignedCookie(cookies.sessionToken, newSession.token, ctx.secret, 10 * 60);
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
