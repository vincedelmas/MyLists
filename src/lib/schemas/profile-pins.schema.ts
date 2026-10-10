import * as z from "zod";
import {usernameSchema} from "@/lib/schemas/common.schema";


export const MAX_PROFILE_PINS = 4;


export const profilePinSchema = z.strictObject({
    kind: z.enum(["dynamic", "collection"]),
    id: z.number().int().positive(),
    pinned: z.boolean(),
});


export type ProfilePinItem = Pick<z.infer<typeof profilePinSchema>, "kind" | "id">;


export const profilePinsSchema = z.strictObject({ username: usernameSchema });
