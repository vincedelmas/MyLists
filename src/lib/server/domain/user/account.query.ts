import {GeneralSettings} from "@/lib/schemas";
import {ValidationError} from "@/lib/utils/error-classes";
import {UserRepository} from "@/lib/server/domain/user/user.repository";


export class AccountQuery {
    constructor(private readonly repository = UserRepository) {}

    getMinimalSettings(userId: number) {
        return this.repository.getMinimalUserSettings(userId);
    }

    findByUsername(username: string) {
        return this.repository.findByUsername(username);
    }

    findById(userId: number) {
        return this.repository.findById(userId);
    }

    async assertUsernameAvailable(name: string) {
        if (await this.repository.findUserByName(name)) {
            throw new ValidationError<GeneralSettings>("username", "Invalid username. Please select another one.");
        }
    }

    search(query: string, page = 1) {
        return this.repository.searchUsers(query, page);
    }

    async getProfileImageFilenames() {
        const results = await this.repository.getProfileImageFilenames();
        return results.flatMap(({ image }) => image ? [image.split("/").pop() ?? image] : []);
    }

    async getBackgroundImageFilenames() {
        const results = await this.repository.getBackgroundImageFilenames();
        return results.map(({ backgroundImage }) => backgroundImage.split("/").pop() ?? backgroundImage);
    }
}
