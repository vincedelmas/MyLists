import {describe, expect, it, vi} from "vitest";
import {AccountService} from "@/lib/server/domain/account/account.service";
import {AccountRepository} from "@/lib/server/domain/account/account.repository";
import {InactiveAccountService} from "@/lib/server/domain/account/inactive-account.service";


vi.mock("@/lib/server/database/async-storage", () => ({
    withTransaction: async <T>(action: () => Promise<T>) => action(),
}));


const createService = () => {
    const accountRepository = {
        deleteUserAccount: vi.fn().mockResolvedValue(undefined),
    } as unknown as typeof AccountRepository;

    const inactiveAccountService = {
        markAsDeleted: vi.fn().mockResolvedValue(true),
        deleteRowsForUser: vi.fn().mockResolvedValue(undefined),
    } as unknown as InactiveAccountService;

    return {
        accountRepository,
        inactiveAccountService,
        service: new AccountService(accountRepository, inactiveAccountService),
    };
};


describe("AccountService.deleteUserAccount", () => {
    it("deletes manual accounts after removing inactive account lifecycle rows", async () => {
        const { service, accountRepository, inactiveAccountService } = createService();

        await expect(service.deleteUserAccount({ type: "manual", userId: 42 })).resolves.toBe(true);

        expect(accountRepository.deleteUserAccount).toHaveBeenCalledOnce();
        expect(accountRepository.deleteUserAccount).toHaveBeenCalledWith(42);
        expect(inactiveAccountService.markAsDeleted).not.toHaveBeenCalled();
        expect(inactiveAccountService.deleteRowsForUser).toHaveBeenCalledOnce();
        expect(inactiveAccountService.deleteRowsForUser).toHaveBeenCalledWith(42);
    });

    it("deletes inactive accounts only after the lifecycle row is marked as deleted", async () => {
        const { service, accountRepository, inactiveAccountService } = createService();

        await expect(service.deleteUserAccount({
            userId: 42,
            lifecycleId: 7,
            type: "inactive",
            username: "inactive-user",
        })).resolves.toBe(true);

        expect(accountRepository.deleteUserAccount).toHaveBeenCalledOnce();
        expect(accountRepository.deleteUserAccount).toHaveBeenCalledWith(42);
        expect(inactiveAccountService.markAsDeleted).toHaveBeenCalledOnce();
        expect(inactiveAccountService.deleteRowsForUser).not.toHaveBeenCalled();
        expect(inactiveAccountService.markAsDeleted).toHaveBeenCalledWith(7, 42, "inactive-user");
    });

    it("does not delete inactive accounts when the lifecycle row cannot be marked as deleted", async () => {
        const { service, accountRepository, inactiveAccountService } = createService();
        vi.mocked(inactiveAccountService.markAsDeleted).mockResolvedValue(false);

        await expect(service.deleteUserAccount({
            userId: 42,
            lifecycleId: 7,
            type: "inactive",
            username: "active-again-user",
        })).resolves.toBe(false);

        expect(accountRepository.deleteUserAccount).not.toHaveBeenCalled();
        expect(inactiveAccountService.markAsDeleted).toHaveBeenCalledOnce();
        expect(inactiveAccountService.markAsDeleted).toHaveBeenCalledWith(7, 42, "active-again-user");
    });
});
