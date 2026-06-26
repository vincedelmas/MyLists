import * as z from "zod";
import {coercedPositiveIntFieldSchema} from "@/lib/schemas/common.schema";


export const followUserSchema = z.object({
    targetUserId: coercedPositiveIntFieldSchema,
});

export const respondToFollowRequestSchema = z.object({
    action: z.enum(["accept", "decline"]),
    followerId: coercedPositiveIntFieldSchema,
});

export const removeFollowerSchema = z.object({
    followerId: coercedPositiveIntFieldSchema,
});
