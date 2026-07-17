import {describe, expect, it, vi} from "vitest";
import {FeatureStatus, SocialNotifType} from "@/lib/utils/enums";
import {FeatureVoteCommands} from "./feature-vote.commands";
import {FeatureVotesQuery} from "./feature-votes.query";
import type {FeatureVotesRepository} from "./feature-votes.repository";
import type {NotificationCommands} from "@/lib/server/domain/notifications/notification.commands";


const createRepository = () => ({
    createFeatureRequest: vi.fn(),
    deleteVoteById: vi.fn(),
    findFeatureWithUserVote: vi.fn(),
    getAdminUserIds: vi.fn(),
    getFeatureRequest: vi.fn(),
    getFeatureVotesData: vi.fn(),
    insertVote: vi.fn(),
    updateFeatureStatus: vi.fn(),
});


const createNotifications = () => ({
    createSocialNotification: vi.fn(),
});


describe("feature vote capabilities", () => {
    it("builds the public board with aggregate and viewer vote state", async () => {
        const repository = createRepository();
        repository.getFeatureVotesData.mockResolvedValue({
            features: [{
                adminComment: null,
                author: { id: 4, image: null, name: "author", email: "hidden@example.com" },
                createdAt: "2026-07-17 00:00:00",
                createdBy: 4,
                description: "Useful feature",
                id: 12,
                status: FeatureStatus.PLANNED,
                title: "Feature",
            }],
            userVotes: [{ featureId: 12 }],
            voteAgg: [{ featureId: 12, totalVotes: 3 }],
        });
        const query = new FeatureVotesQuery(repository as unknown as typeof FeatureVotesRepository);

        await expect(query.getFeatureVotes(9)).resolves.toEqual({
            items: [{
                adminComment: null,
                author: { id: 4, image: null, name: "author" },
                createdAt: "2026-07-17 00:00:00",
                description: "Useful feature",
                hasUserVote: true,
                id: 12,
                status: FeatureStatus.PLANNED,
                title: "Feature",
                totalVotes: 3,
            }],
        });
    });

    it("toggles an open feature vote in both directions", async () => {
        const repository = createRepository();
        const notifications = createNotifications();
        const commands = new FeatureVoteCommands(
            repository as unknown as typeof FeatureVotesRepository,
            notifications as unknown as NotificationCommands,
        );
        repository.findFeatureWithUserVote
            .mockResolvedValueOnce({ feature: { status: FeatureStatus.PLANNED }, existingVote: undefined })
            .mockResolvedValueOnce({ feature: { status: FeatureStatus.PLANNED }, existingVote: { id: 22 } });

        await commands.toggleFeatureVote(12, 9);
        await commands.toggleFeatureVote(12, 9);

        expect(repository.insertVote).toHaveBeenCalledWith({ featureId: 12, userId: 9 });
        expect(repository.deleteVoteById).toHaveBeenCalledWith(22);
    });

    it("rejects votes for completed features", async () => {
        const repository = createRepository();
        const commands = new FeatureVoteCommands(
            repository as unknown as typeof FeatureVotesRepository,
            createNotifications() as unknown as NotificationCommands,
        );
        repository.findFeatureWithUserVote.mockResolvedValue({
            existingVote: undefined,
            feature: { status: FeatureStatus.COMPLETED },
        });

        await expect(commands.toggleFeatureVote(12, 9)).rejects.toThrow("Voting is closed for this feature.");
        expect(repository.insertVote).not.toHaveBeenCalled();
    });

    it("notifies a non-admin author only when moderation changes", async () => {
        const repository = createRepository();
        const notifications = createNotifications();
        const commands = new FeatureVoteCommands(
            repository as unknown as typeof FeatureVotesRepository,
            notifications as unknown as NotificationCommands,
        );
        repository.getFeatureRequest.mockResolvedValue({
            adminComment: null,
            createdBy: 4,
            status: FeatureStatus.UNDER_CONSIDERATION,
        });

        await commands.updateFeatureStatus({ featureId: 12, status: FeatureStatus.PLANNED }, 1);

        expect(repository.updateFeatureStatus).toHaveBeenCalledWith(12, FeatureStatus.PLANNED, null);
        expect(notifications.createSocialNotification).toHaveBeenCalledWith({
            actorId: 1,
            featureRequestId: 12,
            type: SocialNotifType.FEATURE_REQUEST_UPDATED,
            userId: 4,
        });
    });
});
