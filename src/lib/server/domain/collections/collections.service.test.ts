import {describe, expect, it, vi} from "vitest";
import {AuthorizationService, toActor} from "@/lib/server/authorization";
import {FormattedError, UnauthorizedError} from "@/lib/utils/error-classes";
import {DenialReason, MediaType, PrivacyType, RoleType} from "@/lib/utils/enums";
import type {MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";
import {CollectionsService} from "@/lib/server/domain/collections/collections.service";
import {CollectionsRepository} from "@/lib/server/domain/collections/collections.repository";


const createService = () => {
    const collection = {
        id: 7,
        ownerId: 10,
        itemsCount: 2,
        ordered: false,
        title: "Favorites",
        description: null,
        mediaType: MediaType.MOVIES,
        privacy: PrivacyType.PUBLIC,
        ownerPrivacy: PrivacyType.PUBLIC,
    };

    const repository = {
        getCollectionById: vi.fn().mockResolvedValue(collection),
        getCollectionItems: vi.fn().mockResolvedValue([]),
        findLikedCollection: vi.fn().mockResolvedValue(null),
        incrementViewCount: vi.fn().mockResolvedValue(undefined),
        getMaxCollectionItemOrder: vi.fn().mockResolvedValue(0),
        insertCollectionItem: vi.fn().mockResolvedValue(undefined),
        deleteCollectionItem: vi.fn().mockResolvedValue(undefined),
        updateCollection: vi.fn().mockResolvedValue(undefined),
        replaceCollectionItems: vi.fn().mockResolvedValue(undefined),
        deleteCollection: vi.fn().mockResolvedValue(undefined),
        insertLike: vi.fn().mockResolvedValue(undefined),
        incrementLikeCount: vi.fn().mockResolvedValue(undefined),
        deleteLike: vi.fn().mockResolvedValue(undefined),
        decrementLikeCount: vi.fn().mockResolvedValue(undefined),
        createCollection: vi.fn().mockResolvedValue(99),
        incrementCopyCount: vi.fn().mockResolvedValue(undefined),
        getUserCollections: vi.fn().mockResolvedValue([]),
        getPaginatedUserCollections: vi.fn().mockResolvedValue({
            page: 1,
            pages: 0,
            total: 0,
            items: [],
            perPage: 12,
        }),
    } as unknown as typeof CollectionsRepository;

    const capabilities = {
        read: true,
        edit: false,
        like: true,
        copy: true,
        delete: false,
        addItem: false,
        removeItem: false,
    };
    const authorizationService = {
        decideCollection: vi.fn().mockResolvedValue({ allowed: true }),
        getCollectionCapabilities: vi.fn().mockResolvedValue(capabilities),
    } as unknown as AuthorizationService;
    const mediaService = {
        getMediaDetailsByIds: vi.fn().mockResolvedValue([]),
    };
    const mediaRegistry = {
        get: vi.fn().mockReturnValue(mediaService),
    } as unknown as MediaServiceRegistry;
    const service = new CollectionsService(authorizationService, repository, mediaRegistry);

    return {
        service,
        collection,
        repository,
        capabilities,
        mediaService,
        authorizationService,
    };
};


describe("CollectionsService.getUserCollections", () => {
    it("forwards an admin actor to the repository visibility scope", async () => {
        const { repository, service } = createService();

        const actor = toActor({ id: 20, role: RoleType.ADMIN });
        await service.getUserCollections(10, actor, MediaType.MOVIES);

        expect(repository.getUserCollections).toHaveBeenCalledWith(10, actor, MediaType.MOVIES);
    });

    it("forwards an owner actor to the repository visibility scope", async () => {
        const { repository, service } = createService();

        const actor = toActor({ id: 10, role: RoleType.USER });
        await service.getUserCollections(10, actor);

        expect(repository.getUserCollections).toHaveBeenCalledWith(10, actor, undefined);
    });

    it("forwards a regular viewer to the repository visibility scope", async () => {
        const { repository, service } = createService();

        const actor = toActor({ id: 20, role: RoleType.USER });
        await service.getUserCollections(10, actor);

        expect(repository.getUserCollections).toHaveBeenCalledWith(10, actor, undefined);
    });
});


describe("CollectionsService.getPaginatedUserCollections", () => {
    it("passes filters and the viewer actor through", async () => {
        const { repository, service } = createService();
        const filters = { search: "favorites", page: 2, mediaType: MediaType.MOVIES };

        const actor = toActor({ id: 20, role: RoleType.USER });
        await service.getPaginatedUserCollections(10, filters, actor);

        expect(repository.getPaginatedUserCollections).toHaveBeenCalledWith(10, actor, filters);
    });

    it("passes the owner actor through", async () => {
        const { repository, service } = createService();
        const filters = { search: undefined, page: 1, mediaType: undefined };

        const actor = toActor({ id: 10, role: RoleType.USER });
        await service.getPaginatedUserCollections(10, filters, actor);

        expect(repository.getPaginatedUserCollections).toHaveBeenCalledWith(10, actor, filters);
    });
});


describe("CollectionsService authorization", () => {
    it("stops collection-detail loading when access is denied and preserves restricted errors", async () => {
        const { authorizationService, repository, service } = createService();
        const actor = toActor();

        vi.mocked(authorizationService.decideCollection).mockResolvedValue({
            allowed: false,
            reason: DenialReason.PROFILE_RESTRICTED,
        });

        await expect(service.getCollectionDetails(7, "read", actor))
            .rejects.toMatchObject({
                name: "UnauthorizedError",
                type: "restricted",
            });

        expect(repository.getCollectionItems).not.toHaveBeenCalled();
        expect(repository.incrementViewCount).not.toHaveBeenCalled();
        expect(authorizationService.getCollectionCapabilities).not.toHaveBeenCalled();
    });

    it("returns capabilities produced by the authorization service", async () => {
        const { authorizationService, capabilities, collection, repository, service } = createService();
        const actor = toActor({ id: 20, role: RoleType.USER });

        const result = await service.getCollectionDetails(7, "read", actor);

        expect(authorizationService.decideCollection).toHaveBeenCalledWith(actor, "read", collection);
        expect(authorizationService.getCollectionCapabilities).toHaveBeenCalledWith(actor, collection);
        expect(repository.findLikedCollection).toHaveBeenCalledWith(20, 7);
        expect(result.capabilities).toEqual(capabilities);
    });

    it("rejects collection updates before any write for unauthorized viewers", async () => {
        const { repository, service } = createService();
        const actor = toActor({ id: 20, role: RoleType.USER });

        await expect(service.updateCollection({
            actor,
            collectionId: 7,
            title: "Changed",
            ordered: false,
            privacy: PrivacyType.PUBLIC,
            items: [{ mediaId: 1 }],
        })).rejects.toThrow(FormattedError);

        expect(repository.updateCollection).not.toHaveBeenCalled();
        expect(repository.replaceCollectionItems).not.toHaveBeenCalled();
    });

    it("rejects owner-only item mutations before any write", async () => {
        const { repository, service } = createService();
        const actor = toActor({ id: 20, role: RoleType.MANAGER });
        const params = {
            actor,
            mediaId: 1,
            mediaType: MediaType.MOVIES,
            collectionId: 7,
        };

        await expect(service.addMediaToCollection(params)).rejects.toThrow(FormattedError);
        await expect(service.removeMediaFromCollection(params)).rejects.toThrow(FormattedError);

        expect(repository.getMaxCollectionItemOrder).not.toHaveBeenCalled();
        expect(repository.insertCollectionItem).not.toHaveBeenCalled();
        expect(repository.deleteCollectionItem).not.toHaveBeenCalled();
    });

    it("does not alter likes when the interaction policy denies access", async () => {
        const { authorizationService, repository, service } = createService();
        const actor = toActor({ id: 20, role: RoleType.USER });

        vi.mocked(authorizationService.decideCollection).mockResolvedValue({
            allowed: false,
            reason: DenialReason.RESOURCE_PRIVATE,
        });

        await expect(service.toggleLike(7, actor)).rejects.toThrow(UnauthorizedError);

        expect(repository.findLikedCollection).not.toHaveBeenCalled();
        expect(repository.insertLike).not.toHaveBeenCalled();
        expect(repository.deleteLike).not.toHaveBeenCalled();
    });

    it("does not copy collection data when the interaction policy denies access", async () => {
        const { authorizationService, repository, service } = createService();
        const actor = toActor({ id: 20, role: RoleType.USER });

        vi.mocked(authorizationService.decideCollection).mockResolvedValue({
            allowed: false,
            reason: DenialReason.RESOURCE_PRIVATE,
        });

        await expect(service.copyCollection(7, actor)).rejects.toThrow(UnauthorizedError);

        expect(repository.getCollectionItems).not.toHaveBeenCalled();
        expect(repository.createCollection).not.toHaveBeenCalled();
        expect(repository.incrementCopyCount).not.toHaveBeenCalled();
    });
});
