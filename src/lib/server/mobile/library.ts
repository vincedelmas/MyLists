import * as z from "zod";
import { UnauthorizedError } from "@/lib/utils/error-classes";
import { toActor } from "@/lib/server/authorization";
import { getContainer } from "@/lib/server/core/container";
import { mobileImagePath } from "@/lib/server/mobile/images";
import { getImageUrl } from "@/lib/server/core/images/image-url";
import { getContinueItems } from "@/lib/server/domain/continue/continue.repository";
import { getServerMediaDefinition } from "@/lib/media-definitions/definition.registry.server";
import { dynamicListsRepository } from "@/lib/server/domain/dynamic-lists/dynamic-lists.repository";
import {
    getDynamicListResults,
    getDynamicListSummaries,
} from "@/lib/server/domain/dynamic-lists/dynamic-lists.queries";

export const librarySearchSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    search: z.string().trim().max(100).default(""),
});

export const libraryDetailSchema = librarySearchSchema
    .extend({
        kind: z.enum(["collection", "dynamic", "continue"]),
        id: z.coerce.number().int().positive().optional(),
    })
    .refine((input) => input.kind === "continue" || input.id !== undefined, "A list ID is required.");

export const getMobileLibrary = async (userId: number, { page, search }: z.infer<typeof librarySearchSchema>) => {
    const { services } = await getContainer();

    const views = dynamicListsRepository
        .getAll(userId)
        .filter((view) => view.spec.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()));

    const selected = views.slice((page - 1) * 8, page * 8);
    const summaries = getDynamicListSummaries(userId, selected);

    const collections = await services.collections.getPaginatedUserCollections(
        userId,
        { page, search },
        toActor({ id: userId }),
    );

    return {
        page,
        hasMore: page < Math.ceil(views.length / 8) || page < collections.pages,
        dynamic: selected.map((view) => ({
            id: view.id,
            title: view.spec.title,
            total: summaries.get(view.id)!.total,
        })),
        collections: collections.items.map((item) => ({
            id: item.id,
            title: item.title,
            privacy: item.privacy,
            description: item.description,
            previews: item.previews.map((prev) => ({ ...prev, mediaCover: mobileImagePath(prev.mediaCover) })),
        })),
    };
};

export const getMobileLibraryDetail = async (
    userId: number,
    input: z.infer<typeof libraryDetailSchema>,
    viewerId = userId,
) => {
    if (viewerId !== userId && input.kind !== "continue") throw new UnauthorizedError("private");
    const { services } = await getContainer();
    const user = (await services.account.getUserById(userId))!;

    if (input.kind === "continue") {
        const active = user.userMediaSettings
            .filter((setting) => setting.active)
            .map((setting) => setting.mediaType)
            .filter((type) => type !== "movies");

        const visible = viewerId === userId || (await services.profile.getContinueVisibility(userId));
        const all = visible ? await getContinueItems(userId, active) : [];

        return {
            page: input.page,
            title: "Continue",
            visible,
            ratingSystem: user.ratingSystem,
            pages: Math.ceil(all.length / 30),
            items: all.slice((input.page - 1) * 30, input.page * 30).map((item) => ({
                status: item.status,
                rating: item.rating,
                name: item.mediaName,
                mediaId: item.mediaId,
                favorite: item.favorite,
                mediaType: item.mediaType,
                cover: mobileImagePath(
                    getImageUrl(getServerMediaDefinition(item.mediaType).identity.coverDirectory, item.imageCover),
                ),
            })),
        };
    }

    if (input.kind === "dynamic") {
        const view = dynamicListsRepository.get(userId, input.id!);
        const result = getDynamicListResults(userId, view.spec, { page: input.page, viewerId: userId });

        return {
            page: result.page,
            pages: result.pages,
            title: view.spec.title,
            ratingSystem: user.ratingSystem,
            items: result.items.map((item) => ({
                status: item.status,
                rating: item.rating,
                name: item.mediaName,
                mediaId: item.mediaId,
                favorite: item.favorite,
                mediaType: item.mediaType,
                cover: mobileImagePath(item.imageCover),
            })),
        };
    }

    const result = await services.collections.getCollectionDetails(input.id!, "read", toActor({ id: userId }), {
        page: input.page,
    });

    return {
        page: result.page,
        pages: result.pages,
        title: result.collection.title,
        ratingSystem: user.ratingSystem,
        items: result.items.map((item) => ({
            rating: item.rating,
            status: item.status,
            name: item.mediaName,
            mediaId: item.mediaId,
            favorite: item.favorite,
            mediaType: item.mediaType,
            cover: mobileImagePath(item.mediaCover),
        })),
    };
};
