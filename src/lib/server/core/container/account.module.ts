import {AuthorizationService} from "@/lib/server/authorization";
import {MediaModule} from "@/lib/server/core/container/media.module";
import {SocialService} from "@/lib/server/domain/social/social.service";
import {createAccountService} from "@/lib/server/domain/account/account.service";
import {ProfileService} from "@/lib/server/domain/profile/profile.service";
import {SocialRepository} from "@/lib/server/domain/social/social.repository";
import {accountRepository} from "@/lib/server/domain/account/account.repository";
import {ProfileRepository} from "@/lib/server/domain/profile/profile.repository";
import {TasteSimilarityService} from "@/lib/server/domain/social/taste-similarity.service";
import {InactiveAccountService} from "@/lib/server/domain/account/inactive-account.service";
import {TasteSimilarityRepository} from "@/lib/server/domain/social/taste-similarity.repository";
import {InactiveAccountRepository} from "@/lib/server/domain/account/inactive-account.repository";


export function setupAccountModule(mediaModule: MediaModule) {
    const repositories = {
        social: SocialRepository,
        account: accountRepository,
        profile: ProfileRepository,
        inactiveAccount: InactiveAccountRepository,
        tasteSimilarity: TasteSimilarityRepository,
    };

    const socialService = new SocialService(repositories.social);
    const inactiveAccountService = new InactiveAccountService(repositories.inactiveAccount);
    const accountService = createAccountService(repositories.account, inactiveAccountService);

    return {
        repositories,
        services: {
            social: socialService,
            account: accountService,
            inactiveAccount: inactiveAccountService,
            authorization: new AuthorizationService(socialService),
            tasteSimilarity: new TasteSimilarityService(repositories.tasteSimilarity),
            profile: new ProfileService(repositories.profile, mediaModule.registries.mediaService),
        },
    };
}


export type AccountModule = ReturnType<typeof setupAccountModule>;
