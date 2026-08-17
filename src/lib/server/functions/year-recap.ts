import {RatingSystemType} from "@/lib/utils/enums";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {yearRecapImageInputSchema, yearRecapInputSchema} from "@/lib/schemas";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {contentAuthorizationMiddleware} from "@/lib/server/middlewares/authorization";


export const getYearRecap = createServerFn({ method: "GET" })
    .middleware([contentAuthorizationMiddleware])
    .validator(yearRecapInputSchema)
    .handler(async ({ data: { year, mediaType }, context: { user } }) => {
        const container = await getContainer();
        const adminService = container.services.admin;
        const yearRecapService = container.services.yearRecap;

        const release = await adminService.getYearRecapReleaseStatus(year);
        const recap = await yearRecapService.getYearRecap(user.id, year, { mediaType, isAvailable: release.isAvailable });

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


export const postGenerateYearRecapImage = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(yearRecapImageInputSchema)
    .handler(async ({ data: { year, mediaType }, context: { currentUser } }) => {
        const { renderYearRecapImage } = await import("@/lib/server/domain/year-recap/year-recap-image");
        
        const container = await getContainer();
        const adminService = container.services.admin;
        const yearRecapService = container.services.yearRecap;

        const release = await adminService.getYearRecapReleaseStatus(year);
        const recap = await yearRecapService.getYearRecap(currentUser.id, year, { mediaType, isAvailable: release.isAvailable });

        return renderYearRecapImage({
            ...recap,
            user: {
                name: currentUser.name,
                ratingSystem: currentUser.ratingSystem as RatingSystemType,
            },
        });
    });
