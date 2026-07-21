import {describe, expect, it, vi} from "vitest";


const dbMocks = vi.hoisted(() => {
    const transactionClient = { kind: "transaction" };

    return {
        transactionClient,
        transaction: vi.fn(async (action) => action(transactionClient)),
    };
});


vi.mock("@/lib/server/database/db", () => ({
    db: {
        transaction: dbMocks.transaction,
    },
}));


import {withTransaction} from "@/lib/server/database/async-storage";


describe("withTransaction", () => {
    it("reuses the active transaction for nested operations", async () => {
        await withTransaction(async (outerTransaction) => {
            expect(outerTransaction).toBe(dbMocks.transactionClient);

            await withTransaction(async (innerTransaction) => {
                expect(innerTransaction).toBe(outerTransaction);
            });
        });

        expect(dbMocks.transaction).toHaveBeenCalledTimes(1);
    });
});
