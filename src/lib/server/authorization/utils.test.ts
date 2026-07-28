import {RoleType} from "@/lib/utils/enums";
import {describe, expect, it} from "vitest";
import {getGlobalCapabilities, hasRequiredRole, toActor,} from "@/lib/server/authorization/utils";


describe("authorization utils", () => {
    it("normalizes missing and unknown identities with least privilege", () => {
        expect(toActor()).toEqual({ kind: "anonymous" });
        expect(toActor(null)).toEqual({ kind: "anonymous" });
        expect(toActor({ id: 10, role: "unknown-role" })).toEqual({ id: 10, kind: "user", role: RoleType.USER });
    });

    it.each([
        [undefined, RoleType.USER, false],
        [RoleType.USER, RoleType.USER, true],
        [RoleType.USER, RoleType.MANAGER, false],
        [RoleType.MANAGER, RoleType.USER, true],
        [RoleType.MANAGER, RoleType.MANAGER, true],
        [RoleType.MANAGER, RoleType.ADMIN, false],
        [RoleType.ADMIN, RoleType.USER, true],
        [RoleType.ADMIN, RoleType.MANAGER, true],
        [RoleType.ADMIN, RoleType.ADMIN, true],
    ])("%s requiring %s resolves to %s", (actorRole, requiredRole, expected) => {
        const actor = actorRole
            ? toActor({ id: 10, role: actorRole })
            : toActor();

        expect(hasRequiredRole(actor, requiredRole)).toBe(expected);
    });

    it.each([
        [undefined, { editCatalog: false, enterAdminDashboard: false, manageFeatureRequests: false }],
        [RoleType.USER, { editCatalog: false, enterAdminDashboard: false, manageFeatureRequests: false }],
        [RoleType.MANAGER, { editCatalog: true, enterAdminDashboard: false, manageFeatureRequests: false }],
        [RoleType.ADMIN, { editCatalog: true, enterAdminDashboard: true, manageFeatureRequests: true }],
    ])("derives global capabilities for %s", (role, expected) => {
        const actor = role
            ? toActor({ id: 10, role })
            : toActor();

        expect(getGlobalCapabilities(actor)).toEqual(expected);
    });
});
