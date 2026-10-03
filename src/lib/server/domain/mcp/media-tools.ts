import z from "zod";
import {getTvSeasons} from "@/lib/server/functions/tv-seasons";
import {mediaTypeMediaIdSchema} from "@/lib/schemas/common.schema";
import type {ToolContext} from "@/lib/server/core/mcp/tool-context";
import {getSearchResults, getGameAdvancedSearchOptions} from "@/lib/server/functions/search";
import {mediaDetailsSchema, externalMediaResolveSchema} from "@/lib/schemas/media-details.schema";
import {addMediaToListSchema, updateUserMediaSchema, userTagNamesSchema} from "@/lib/schemas/user-media.schema";
import {getMediaListSF, getMediaListFilters, getMediaListSearchFilters} from "@/lib/server/functions/media-lists";
import {getMediaDetails, resolveExternalMedia, getGameCompatiblePlatforms} from "@/lib/server/functions/media-details";
import {postAddMediaToList, postUpdateUserMedia, postEditUserTag, postUpdateUserCustomCover, getUserMediaHistory, getUserTagNames} from "@/lib/server/functions/user-media";
import {
    mediaListInputSchema,
    mediaListFiltersInputSchema,
    mediaListSearchFiltersInputSchema,
    tvSeasonsInputSchema,
    mediaSearchInputSchema,
    editMediaTagInputSchema,
    mediaCoverInputSchema
} from "@/lib/server/domain/mcp/tool-schemas";


export const registerMediaTools = ({ register, userId, username }: ToolContext) => {
    register("media_details", {
        inputSchema: mediaDetailsSchema.strict(),
        description: "Read catalog details, your list entry and similar titles. mediaId is a MyLists ID; userMedia is null if unlisted.",
    }, async data => {
        const { media, userMedia, similarMedia } = await getMediaDetails({ data });
        return { media, userMedia, similarMedia };
    });

    register("tv_seasons", {
        inputSchema: tvSeasonsInputSchema,
        description: "Read your TV seasons: episode counts, ratings and rewatches.",
    }, data => getTvSeasons({ data: { ...data, userId } }));

    register("game_platforms", {
        inputSchema: mediaTypeMediaIdSchema.strict(),
        description: "List a game's compatible platforms.",
    }, data => getGameCompatiblePlatforms({ data }));

    register("media_history", {
        inputSchema: mediaTypeMediaIdSchema.strict(),
        description: "Read your entry's history, newest first. " +
            "Use completion/rewatch events for consumption dates, other edits do not record consumption.",
    }, data => getUserMediaHistory({ data }));

    register("search_catalog", {
        inputSchema: mediaSearchInputSchema,
        annotations: { openWorldHint: true },
        description: "Search external catalogs; filters must match the provider. " +
            "Result id is the provider ID; mediaId, when present, is a MyLists ID. " +
            "Resolve provider IDs with resolve_catalog_media before add_media.",
    }, data => getSearchResults({ data }));

    register("game_search_options", {
        inputSchema: z.object({}).strict(),
        annotations: { openWorldHint: true },
        description: "List game genre and platform IDs for advanced searches.",
    }, () => getGameAdvancedSearchOptions());

    register("search_my_list", {
        inputSchema: mediaListInputSchema,
        description: "Search your list. Use my_list_filters and search_my_list_filters for filter values; " +
            "results.pagination.availableSorting lists valid sort keys. " +
            "Recently Modified includes rating/note edits; use media_history for consumption dates.",
    }, data => getMediaListSF({ data: { ...data, username } }));

    register("my_list_filters", {
        inputSchema: mediaListFiltersInputSchema,
        description: "List available filters and tags for your media list.",
    }, data => getMediaListFilters({ data: { ...data, username } }));

    register("search_my_list_filters", {
        inputSchema: mediaListSearchFiltersInputSchema,
        description: "Find filter values for people and companies. " +
            "creator maps to movie directors, TV creators, book/manga authors or game developers; " +
            "actor to movies/TV actors; platform to TV networks; publisher to manga/game publishers.",
    }, data => getMediaListSearchFilters({ data: { ...data, username } }));

    register("my_tags", {
        inputSchema: userTagNamesSchema.strict(),
        description: "List your tag names for a media type.",
    }, data => getUserTagNames({ data }));

    register("resolve_catalog_media", {
        write: true,
        inputSchema: externalMediaResolveSchema.strict(),
        annotations: { openWorldHint: true },
        description: "Convert a provider apiId to a MyLists mediaId, importing metadata if needed. " +
            "Then call add_media to add it to your list.",
    }, data => resolveExternalMedia({ data }));

    register("add_media", {
        write: true,
        inputSchema: addMediaToListSchema.strict(),
        annotations: { idempotentHint: false },
        description: "Add a MyLists mediaId to your list. Omitted status uses the media default; set ratings with update_media.",
    }, data => postAddMediaToList({ data }));

    register("update_media", {
        write: true,
        inputSchema: updateUserMediaSchema.strict(),
        annotations: { destructiveHint: true },
        description: "Update one existing entry. Ratings are 0–10; progress, playtime in minutes and repeats are absolute totals. " +
            "TV rewatches require seasonRedos; read seasons first. Status changes can reset progress/repeats. " +
            "loggedAt backdates activity only. " +
            "kind=saved confirms persistence; kind=correction-required is an unsaved preview to review before supplying activityCorrection.",
    }, data => postUpdateUserMedia({ data }));

    register("edit_media_tag", {
        write: true,
        inputSchema: editMediaTagInputSchema,
        annotations: { idempotentHint: false, destructiveHint: true },
        description: "Add or detach a tag on one list entry. Global tag changes are unavailable.",
    }, data => postEditUserTag({ data }));

    register("update_media_cover", {
        write: true,
        inputSchema: mediaCoverInputSchema,
        annotations: { openWorldHint: true, destructiveHint: true },
        description: "Set a custom cover from imageUrl or restore the catalog cover with remove=true.",
    }, data => postUpdateUserCustomCover({ data }));
};
