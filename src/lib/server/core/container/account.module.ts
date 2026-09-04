import {AuthorizationService} from "@/lib/server/authorization";
import {MediaModule} from "@/lib/server/core/container/media.module";
import {createSocialService} from "@/lib/server/domain/social/social.service";
import {createAccountService} from "@/lib/server/domain/account/account.service";
import {createProfileService} from "@/lib/server/domain/profile/profile.service";
import {socialRepository} from "@/lib/server/domain/social/social.repository";
import {accountRepository} from "@/lib/server/domain/account/account.repository";
import {profileRepository} from "@/lib/server/domain/profile/profile.repository";
import {createTasteSimilarityService} from "@/lib/server/domain/social/taste-similarity.service";
import {createInactiveAccountService} from "@/lib/server/domain/account/inactive-account.service";
import {createTasteSimilarityRepository} from "@/lib/server/domain/social/taste-similarity.repository";
import {inactiveAccountRepository} from "@/lib/server/domain/account/inactive-account.repository";


export function setupAccountModule(mediaModule: MediaModule) {
    const repositories = {
        social: socialRepository,
        account: accountRepository,
        profile: profileRepository,
        inactiveAccount: inactiveAccountRepository,
        tasteSimilarity: createTasteSimilarityRepository(mediaModule.registries.tasteSimilarityCatalog),
    };

    const socialService = createSocialService(repositories.social);
    const inactiveAccountService = createInactiveAccountService(repositories.inactiveAccount);
    const accountService = createAccountService(repositories.account, inactiveAccountService);

    return {
        repositories,
        services: {
            social: socialService,
            account: accountService,
            inactiveAccount: inactiveAccountService,
            authorization: new AuthorizationService(socialService),
            tasteSimilarity: createTasteSimilarityService(repositories.tasteSimilarity),
            profile: createProfileService(repositories.profile, mediaModule.registries.mediaService),
        },
    };
}


export type AccountModule = ReturnType<typeof setupAccountModule>;
