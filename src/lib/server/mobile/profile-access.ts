import { notFound } from "@tanstack/react-router";
import { coercedPositiveIntFieldSchema } from "@/lib/schemas/common.schema";
import { toActor } from "@/lib/server/authorization";
import { getContainer } from "@/lib/server/core/container";
import { UnauthorizedError } from "@/lib/utils/error-classes";

// A query parameter selects the subject; the authenticated session remains the viewer.
export const resolveMobileProfileUser = async (request: Request, viewerId: number) => {
    const raw = new URL(request.url).searchParams.get("userId");
    const targetId = raw === null ? viewerId : coercedPositiveIntFieldSchema.parse(raw);
    if (targetId === viewerId) return targetId;
    const { services } = await getContainer();
    const target = await services.account.getUserById(targetId);
    if (!target) throw notFound();
    const decision = await services.authorization.decideProfile(toActor({ id: viewerId }), target);
    if (!decision.allowed) throw new UnauthorizedError("private");
    return targetId;
};
