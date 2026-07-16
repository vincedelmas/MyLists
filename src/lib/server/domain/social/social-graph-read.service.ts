import {LibraryAccessScope} from "@/lib/server/domain/access/library-access.policy";
import {SocialGraphRepository} from "@/lib/server/domain/social/social-graph.repository";


export class SocialGraphReadService {
    constructor(private readonly repository = new SocialGraphRepository()) {}

    getPublicHeader(ownerId: number, viewerId?: number) {
        return {
            ...this.repository.getCounts(ownerId),
            followStatus: viewerId === ownerId || viewerId === undefined
                ? undefined
                : this.repository.getFollowingStatus(viewerId, ownerId),
        };
    }

    getFollowingStatus(followerId: number, followedId: number) {
        if (followerId === followedId) return undefined;
        return this.repository.getFollowingStatus(followerId, followedId);
    }

    getFollowers(access: LibraryAccessScope, ownerId: number, viewerId?: number, limit = 8) {
        this.assertOwnerScope(access, ownerId);
        return this.repository.getFollowers(viewerId, ownerId, limit);
    }

    getFollows(access: LibraryAccessScope, ownerId: number, viewerId?: number, limit = 8) {
        this.assertOwnerScope(access, ownerId);
        return this.repository.getFollows(viewerId, ownerId, limit);
    }

    private assertOwnerScope(access: LibraryAccessScope, ownerId: number) {
        if (access.ownerId !== ownerId) {
            throw new Error(`Library access scope for user ${access.ownerId} cannot read social members for user ${ownerId}.`);
        }
    }
}
