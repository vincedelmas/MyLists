import * as z from "zod";
import {getContainer} from "@/lib/server/core/container";
import {toActor} from "@/lib/server/authorization";
import {getDynamicListResults, getDynamicListSummaries} from "@/lib/server/domain/dynamic-lists/dynamic-lists.queries";
import {dynamicListsRepository} from "@/lib/server/domain/dynamic-lists/dynamic-lists.repository";
import {getContinueItems} from "@/lib/server/domain/continue/continue.repository";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";
import {getImageUrl} from "@/lib/server/core/images/image-url";
import {mobileImagePath} from "./images";

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

export const getMobileLibrary = async (userId: number, {page, search}: z.infer<typeof librarySearchSchema>) => {
    const {services} = await getContainer();
    const views = dynamicListsRepository
        .getAll(userId)
        .filter((view) => view.spec.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
    const selected = views.slice((page - 1) * 8, page * 8);
    const summaries = getDynamicListSummaries(userId, selected);
    const collections = await services.collections.getPaginatedUserCollections(
        userId,
        {page, search},
        toActor({id: userId}),
    );
    return {
        page,
        hasMore: page < Math.ceil(views.length / 8) || page < collections.pages,
        dynamic: selected.map((view) => ({id: view.id, title: view.spec.title, total: summaries.get(view.id)!.total})),
        collections: collections.items.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            privacy: item.privacy,
            previews: item.previews.map((preview) => ({...preview, mediaCover: mobileImagePath(preview.mediaCover)})),
        })),
    };
};

export const getMobileLibraryDetail = async (userId: number, input: z.infer<typeof libraryDetailSchema>) => {
    const {services} = await getContainer();
    const user = (await services.account.getUserById(userId))!;
    if (input.kind === "continue") {
        const active = user.userMediaSettings
            .filter((setting) => setting.active)
            .map((setting) => setting.mediaType)
            .filter((type) => type !== "movies");
        const all = await getContinueItems(userId, active);
        return {
            title: "Continue",
            ratingSystem: user.ratingSystem,
            page: input.page,
            pages: Math.ceil(all.length / 30),
            items: all.slice((input.page - 1) * 30, input.page * 30).map((item) => ({
                mediaId: item.mediaId,
                mediaType: item.mediaType,
                name: item.mediaName,
                cover: mobileImagePath(
                    getImageUrl(getServerMediaDefinition(item.mediaType).identity.coverDirectory, item.imageCover),
                ),
                status: item.status,
                rating: item.rating,
                favorite: item.favorite,
            })),
        };
    }
    if (input.kind === "dynamic") {
        const view = dynamicListsRepository.get(userId, input.id!);
        const result = getDynamicListResults(userId, view.spec, {page: input.page, viewerId: userId});
        return {
            title: view.spec.title,
            ratingSystem: user.ratingSystem,
            page: result.page,
            pages: result.pages,
            items: result.items.map((item) => ({
                mediaId: item.mediaId,
                mediaType: item.mediaType,
                name: item.mediaName,
                cover: mobileImagePath(item.imageCover),
                status: item.status,
                rating: item.rating,
                favorite: item.favorite,
            })),
        };
    }
    const result = await services.collections.getCollectionDetails(input.id!, "read", toActor({id: userId}), {
        page: input.page,
    });
    return {
        title: result.collection.title,
        ratingSystem: user.ratingSystem,
        page: result.page,
        pages: result.pages,
        items: result.items.map((item) => ({
            mediaId: item.mediaId,
            mediaType: item.mediaType,
            name: item.mediaName,
            cover: mobileImagePath(item.mediaCover),
            status: item.status,
            rating: item.rating,
            favorite: item.favorite,
        })),
    };
};
