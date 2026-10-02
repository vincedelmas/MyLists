import z from "zod";
import {TagAction} from "@/lib/utils/enums";
import {navbarSearchSchema} from "@/lib/schemas/search.schema";
import {tvSeasonsQuerySchema} from "@/lib/schemas/tv-seasons.schema";
import {editUserTagSchema, updateUserCustomCoverSchema} from "@/lib/schemas/user-media.schema";
import {mediaListSchema, mediaListFiltersSchema, mediaListSearchFiltersSchema} from "@/lib/schemas/media-lists.schema";


export const mediaListFiltersInputSchema = mediaListFiltersSchema.strict();

export const mediaListSearchFiltersInputSchema = mediaListSearchFiltersSchema.strict();

export const tvSeasonsInputSchema = tvSeasonsQuerySchema.omit({ userId: true }).strict();


export const mediaListInputSchema = mediaListSchema.omit({ username: true }).extend({
    args: mediaListSchema.shape.args.omit({ userId: true, currentUserId: true }).strict(),
}).strict();


export const mediaSearchInputSchema = navbarSearchSchema.safeExtend({
    apiProvider: navbarSearchSchema.shape.apiProvider.exclude(["USERS"]),
}).strict();


// Limit tag edits to one list entry, global rename/deletion remain website operations.
export const editMediaTagInputSchema = editUserTagSchema.extend({
    mediaId: editUserTagSchema.shape.mediaId.unwrap(),
    action: z.enum([TagAction.ADD, TagAction.DELETE_ONE]),
    tag: editUserTagSchema.shape.tag.omit({ oldName: true }).strict(),
}).strict();


// MCP accepts a cover URL. The server function validates the URL/remove combination.
export const mediaCoverInputSchema = z.object({
    remove: updateUserCustomCoverSchema.shape.remove,
    mediaId: updateUserCustomCoverSchema.shape.mediaId,
    imageUrl: updateUserCustomCoverSchema.shape.imageUrl,
    mediaType: updateUserCustomCoverSchema.shape.mediaType,
}).strict();
