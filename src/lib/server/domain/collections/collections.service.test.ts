import {describe, expect, it, vi} from "vitest";
import {UserService} from "@/lib/server/domain/user";
import {MediaType, RoleType} from "@/lib/utils/enums";
import {MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";
import {CollectionsService} from "@/lib/server/domain/collections/collections.service";
import {CollectionsRepository} from "@/lib/server/domain/collections/collections.repository";


const createService = () => {
    const repository = {
        getUserCollections: vi.fn().mockResolvedValue([]),
    } as unknown as typeof CollectionsRepository;

    const service = new CollectionsService({} as UserService, repository, {} as typeof MediaServiceRegistry);

    return { repository, service };
};


describe("CollectionsService.getUserCollections", () => {
    it("includes private collections for admins viewing another user", async () => {
        const { repository, service } = createService();

        await service.getUserCollections(10, 20, MediaType.MOVIES, RoleType.ADMIN);

        expect(repository.getUserCollections).toHaveBeenCalledWith(10, true, MediaType.MOVIES);
    });

    it("includes private collections for the collection owner", async () => {
        const { repository, service } = createService();

        await service.getUserCollections(10, 10, undefined, RoleType.USER);

        expect(repository.getUserCollections).toHaveBeenCalledWith(10, true, undefined);
    });

    it("keeps private collections hidden from regular users", async () => {
        const { repository, service } = createService();

        await service.getUserCollections(10, 20, undefined, RoleType.USER);

        expect(repository.getUserCollections).toHaveBeenCalledWith(10, false, undefined);
    });
});
