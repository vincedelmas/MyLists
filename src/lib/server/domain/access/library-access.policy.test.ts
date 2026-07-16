import {describe, expect, it} from "vitest";
import {PrivacyType, RoleType, SocialState} from "@/lib/utils/enums";
import {decideLibraryAccess, decideMediaListAccess, LibraryActor} from "./library-access.policy";


const owner = (privacy: PrivacyType) => ({ id: 10, privacy });
const actor = (id = 20, role: LibraryActor["role"] = RoleType.USER): LibraryActor => ({ id, role });


describe("library access policy", () => {
    it.each([
        ["anonymous", undefined],
        ["member", actor()],
    ])("allows a public library for an %s actor", (_, currentActor) => {
        expect(decideLibraryAccess({ actor: currentActor, owner: owner(PrivacyType.PUBLIC) }).allowed).toBe(true);
    });

    it("requires authentication for a restricted library", () => {
        expect(decideLibraryAccess({ owner: owner(PrivacyType.RESTRICTED) })).toEqual({
            allowed: false,
            reason: "authentication_required",
        });
        expect(decideLibraryAccess({ actor: actor(), owner: owner(PrivacyType.RESTRICTED) })).toMatchObject({
            allowed: true,
            scope: { reason: "member" },
        });
    });

    it("requires an accepted follow for a private library", () => {
        expect(decideLibraryAccess({ actor: actor(), owner: owner(PrivacyType.PRIVATE) })).toEqual({
            allowed: false,
            reason: "follow_required",
        });
        expect(decideLibraryAccess({
            actor: actor(),
            owner: owner(PrivacyType.PRIVATE),
            followState: SocialState.REQUESTED,
        })).toEqual({ allowed: false, reason: "follow_required" });
        expect(decideLibraryAccess({
            actor: actor(),
            owner: owner(PrivacyType.PRIVATE),
            followState: SocialState.ACCEPTED,
        })).toMatchObject({ allowed: true, scope: { reason: "follower" } });
    });

    it("allows the owner and an administrator regardless of privacy", () => {
        expect(decideLibraryAccess({ actor: actor(10), owner: owner(PrivacyType.PRIVATE) })).toMatchObject({
            allowed: true,
            scope: { reason: "owner" },
        });
        expect(decideLibraryAccess({
            actor: actor(99, RoleType.ADMIN),
            owner: owner(PrivacyType.PRIVATE),
        })).toMatchObject({ allowed: true, scope: { reason: "administrator" } });
    });

    it("gates list-derived data on the media channel without changing library access", () => {
        const library = decideLibraryAccess({ actor: actor(), owner: owner(PrivacyType.PUBLIC) });

        expect(decideMediaListAccess(library, false)).toEqual({
            allowed: false,
            reason: "media_type_disabled",
        });
        expect(decideMediaListAccess(library, true)).toMatchObject({
            allowed: true,
            scope: { reason: "public", mediaTypeEnabled: true },
        });
    });
});
