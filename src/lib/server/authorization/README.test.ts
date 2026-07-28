import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";
import {PrivacyType, RoleType} from "@/lib/utils/enums";
import {profilePolicy} from "@/lib/server/authorization/policies/profile.policy";
import {collectionPolicy} from "@/lib/server/authorization/policies/collection.policy";
import {Actor, getGlobalCapabilities, toActor} from "@/lib/server/authorization/utils";


const readme = readFileSync(new URL("./README.md", import.meta.url), "utf8");


const parseContractTable = (name: string) => {
    const marker = `<!-- contract:${name} -->`;
    const markerIndex = readme.indexOf(marker);
    expect(markerIndex, `README contract table "${name}"`).toBeGreaterThanOrEqual(0);

    const lines = readme.slice(markerIndex + marker.length).trimStart().split("\n");
    const tableLines: string[] = [];

    for (const line of lines) {
        if (!line.trim().startsWith("|")) break;
        tableLines.push(line);
    }

    expect(tableLines.length, `README contract table "${name}" rows`).toBeGreaterThanOrEqual(3);

    const toCells = (line: string) => line.split("|").slice(1, -1).map((cell) => cell.trim());
    const headers = toCells(tableLines[0]);

    const rows = tableLines
        .slice(2)
        .map(toCells)
        .map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index]])));

    for (const row of rows) {
        expect(Object.values(row).every((value) => value !== undefined)).toBe(true);
    }

    return rows;
};


const privacyByName: Record<string, PrivacyType> = {
    any: PrivacyType.PRIVATE,
    public: PrivacyType.PUBLIC,
    private: PrivacyType.PRIVATE,
    restricted: PrivacyType.RESTRICTED,
};


const expectDocumentedDecision = (actual: boolean, documented: string, context: string) => {
    expect(["allow", "deny"], `${context}: documented decision`).toContain(documented);
    expect(actual, context).toBe(documented === "allow");
};


describe("authorization README contract", () => {
    it("matches the profile policy matrix", () => {
        const viewerCases: Record<string, { actor: Actor; acceptedFollower: boolean }> = {
            anonymous: { actor: toActor(), acceptedFollower: false },
            user: { actor: toActor({ id: 20, role: RoleType.USER }), acceptedFollower: false },
            "accepted-follower": { actor: toActor({ id: 30, role: RoleType.USER }), acceptedFollower: true },
            manager: { actor: toActor({ id: 40, role: RoleType.MANAGER }), acceptedFollower: false },
            admin: { actor: toActor({ id: 50, role: RoleType.ADMIN }), acceptedFollower: false },
            owner: { actor: toActor({ id: 10, role: RoleType.USER }), acceptedFollower: false },
        };

        for (const row of parseContractTable("profile-access")) {
            const privacy = privacyByName[row.profile];
            expect(privacy, `profile privacy "${row.profile}"`).toBeDefined();

            for (const [viewer, { actor, acceptedFollower }] of Object.entries(viewerCases)) {
                const decision = profilePolicy.decide(actor, { id: 10, privacy }, { acceptedFollower });
                expectDocumentedDecision(decision.allowed, row[viewer], `${row.profile}/${viewer}`);
            }
        }
    });

    it("matches ordinary collection-read visibility", () => {
        const viewerCases: Record<string, { actor: Actor; acceptedFollower: boolean }> = {
            anonymous: { actor: toActor(), acceptedFollower: false },
            user: { actor: toActor({ id: 20, role: RoleType.USER }), acceptedFollower: false },
            "accepted-follower": { actor: toActor({ id: 30, role: RoleType.USER }), acceptedFollower: true },
        };

        for (const row of parseContractTable("collection-read")) {
            const collectionPrivacy = privacyByName[row.collection];
            const ownerPrivacy = privacyByName[row["owner-profile"]];
            expect(collectionPrivacy, `collection privacy "${row.collection}"`).toBeDefined();
            expect(ownerPrivacy, `owner privacy "${row["owner-profile"]}"`).toBeDefined();

            for (const [viewer, { actor, acceptedFollower }] of Object.entries(viewerCases)) {
                const decision = collectionPolicy.decide(actor, "read", {
                    ownerId: 10,
                    ownerPrivacy,
                    privacy: collectionPrivacy,
                }, { acceptedFollower });
                expectDocumentedDecision(
                    decision.allowed,
                    row[viewer],
                    `${row.collection}/${row["owner-profile"]}/${viewer}`,
                );
            }
        }
    });

    it("matches manager and admin collection moderation", () => {
        const actors = {
            manager: toActor({ id: 20, role: RoleType.MANAGER }),
            admin: toActor({ id: 30, role: RoleType.ADMIN }),
        };

        for (const row of parseContractTable("collection-moderation")) {
            const privacy = privacyByName[row.collection];
            expect(privacy, `collection privacy "${row.collection}"`).toBeDefined();

            for (const [role, actor] of Object.entries(actors)) {
                for (const action of ["read", "edit", "delete"] as const) {
                    const decision = collectionPolicy.decide(actor, action, {
                        ownerId: 10,
                        privacy,
                        ownerPrivacy: PrivacyType.PRIVATE,
                    });
                    expectDocumentedDecision(
                        decision.allowed,
                        row[`${role}-${action}`],
                        `${row.collection}/${role}/${action}`,
                    );
                }
            }
        }
    });

    it("matches global role capabilities", () => {
        const actors: Record<string, Actor> = {
            anonymous: toActor(),
            user: toActor({ id: 10, role: RoleType.USER }),
            manager: toActor({ id: 20, role: RoleType.MANAGER }),
            admin: toActor({ id: 30, role: RoleType.ADMIN }),
        };

        for (const row of parseContractTable("global-capabilities")) {
            for (const [role, actor] of Object.entries(actors)) {
                const capabilities = getGlobalCapabilities(actor);
                const capability = row.capability as keyof typeof capabilities;
                expect(capabilities[capability], `known capability "${row.capability}"`).toBeTypeOf("boolean");
                expectDocumentedDecision(capabilities[capability], row[role], `${row.capability}/${role}`);
            }
        }
    });

    it("keeps every documented list function behind its activation middleware", () => {
        const source = readFileSync(new URL("../functions/media-lists.ts", import.meta.url), "utf8");

        for (const row of parseContractTable("active-list-endpoints")) {
            const declaration = `export const ${row["server function"]}`;
            const declarationIndex = source.indexOf(declaration);
            expect(declarationIndex, declaration).toBeGreaterThanOrEqual(0);

            const nextDeclarationIndex = source.indexOf("export const ", declarationIndex + declaration.length);
            const functionBlock = source.slice(
                declarationIndex,
                nextDeclarationIndex === -1 ? source.length : nextDeclarationIndex,
            );

            expect(functionBlock).toContain(`.middleware([${row["required middleware"]}])`);
        }
    });

});
