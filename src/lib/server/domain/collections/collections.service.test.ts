import {describe, expect, it, vi} from "vitest";
import {UserService} from "@/lib/server/domain/user";
import {MediaType, RoleType} from "@/lib/utils/enums";
import {MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";
import {CollectionsService} from "@/lib/server/domain/collections/collections.service";
import {CollectionsRepository} from "@/lib/server/domain/collections/collections.repository";


const createService = () => {
    const repository = {
        getUserCollections: vi.fn().mockResolvedValue([]),
        getPaginatedUserCollections: vi.fn().mockResolvedValue({
            page: 1,
            pages: 0,
            total: 0,
            items: [],
            perPage: 12,
        }),
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


describe("CollectionsService.getPaginatedUserCollections", () => {
    it("passes filters through while keeping private collections hidden from regular viewers", async () => {
        const { repository, service } = createService();
        const filters = { search: "favorites", page: 2, mediaType: MediaType.MOVIES };

        await service.getPaginatedUserCollections(10, filters, 20, RoleType.USER);

        expect(repository.getPaginatedUserCollections).toHaveBeenCalledWith(10, false, filters);
    });

    it("includes private collections for the collection owner", async () => {
        const { repository, service } = createService();
        const filters = { search: undefined, page: 1, mediaType: undefined };

        await service.getPaginatedUserCollections(10, filters, 10, RoleType.USER);

        expect(repository.getPaginatedUserCollections).toHaveBeenCalledWith(10, true, filters);
    });
});
