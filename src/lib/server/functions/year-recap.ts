import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {MediaType} from "@/lib/utils/enums";
import {yearRecapInputSchema} from "@/lib/schemas";
import {contentAuthorizationMiddleware} from "@/lib/server/middlewares/authorization";


const getReleasedYearRecap = async (userId: number, year: number, mediaType?: MediaType) => {
    const container = await getContainer();
    const release = await container.services.admin.getYearRecapReleaseStatus(year);

    return container.services.yearRecap.getYearRecap(userId, year, { mediaType, isAvailable: release.isAvailable });
};


export const getYearRecap = createServerFn({ method: "GET" })
    .middleware([contentAuthorizationMiddleware])
    .validator(yearRecapInputSchema)
    .handler(async ({ data: { year, mediaType }, context: { user } }) => {
        const recap = await getReleasedYearRecap(user.id, year, mediaType);

        return {
            ...recap,
            user: {
                name: user.name,
                ratingSystem: user.ratingSystem,
            },
        };
    });


export const getYearRecapReleases = createServerFn({ method: "GET" })
    .handler(async () => {
        const adminService = await getContainer().then((container) => container.services.admin);
        return adminService.getYearRecapReleases();
    });
