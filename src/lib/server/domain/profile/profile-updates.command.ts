import {ProfileUpdatesRepository} from "@/lib/server/domain/profile/profile-updates.repository";


export class ProfileUpdatesCommand {
    constructor(private readonly repository = ProfileUpdatesRepository) {}

    deleteUserUpdates(userId: number, updateIds: number[], returnData: boolean) {
        return this.repository.deleteUserUpdates(userId, updateIds, returnData);
    }
}
