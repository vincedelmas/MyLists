import {DenialReason, RoleType} from "@/lib/utils/enums";

type ActorSource = {
    id: number;
    role?: string | null;
};


type AnonymousActor = {
    kind: "anonymous";
};


export type AuthenticatedActor = {
    id: number;
    kind: "user";
    role: RoleType;
};


export type Actor = AnonymousActor | AuthenticatedActor;
export type AccessDecision = { allowed: true } | { allowed: false; reason: DenialReason };


const RoleWeight: Record<RoleType, number> = {
    [RoleType.USER]: 10,
    [RoleType.MANAGER]: 20,
    [RoleType.ADMIN]: 30,
};


const roles = new Set<string>(Object.values(RoleType));


export const toActor = (source?: ActorSource | null): Actor => {
    if (!source) return { kind: "anonymous" };

    return {
        kind: "user",
        id: source.id,
        role: roles.has(source.role ?? "") ? source.role as RoleType : RoleType.USER,
    };
};


export const hasRequiredRole = (actor: Actor, role: RoleType) => {
    return actor.kind === "user" && RoleWeight[actor.role] >= RoleWeight[role];
};


export const getGlobalCapabilities = (actor: Actor) => ({
    editCatalog: hasRequiredRole(actor, RoleType.MANAGER),
    enterAdminDashboard: hasRequiredRole(actor, RoleType.ADMIN),
    manageFeatureRequests: hasRequiredRole(actor, RoleType.ADMIN),
});


export const allow = (): AccessDecision => {
    return ({ allowed: true });
}


export const deny = (reason: DenialReason): AccessDecision => {
    return ({ reason, allowed: false });
}
