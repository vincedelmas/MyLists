import {CacheManager, setupCacheManager} from "@/lib/server/core/cache-manager";
import {setupUserModule, UserModule} from "@/lib/server/core/container/user.module";
import {AdminModule, setupAdminModule} from "@/lib/server/core/container/admin.module";
import {MediaModule, setupMediaModule} from "@/lib/server/core/container/media.module";
import {ImportModule, setupImportModule} from "@/lib/server/core/container/import.module";
import {ApiClientModule, setupApiClientsModule} from "@/lib/server/core/container/api-client.module";


interface AppContainer {
    imports: ImportModule;
    cacheManager: CacheManager;
    apiClients: ApiClientModule;
    stats: UserModule["stats"];
    games: UserModule["games"];
    admin: AdminModule["admin"];
    social: UserModule["social"];
    media: MediaModule["registry"];
    account: UserModule["account"];
    profile: UserModule["profile"];
    activity: UserModule["activity"];
    discovery: UserModule["discovery"];
    collections: UserModule["collections"];
    featureVotes: UserModule["featureVotes"];
    achievements: UserModule["achievements"];
    library: MediaModule["shared"]["library"];
    notifications: UserModule["notifications"];
    inactiveAccounts: UserModule["inactiveAccounts"];
    mediaShared: Omit<MediaModule["shared"], "library">;
}


let containerPromise: Promise<AppContainer> | null = null;


async function initContainer(): Promise<AppContainer> {
    const cacheManager = await setupCacheManager();
    const clientsModule = await setupApiClientsModule();

    const adminModule = setupAdminModule();
    const mediaModule = setupMediaModule(clientsModule);

    const userModule = setupUserModule(mediaModule);
    const importModule = setupImportModule(mediaModule.registry);

    return {
        cacheManager,
        apiClients: clientsModule,
        library: mediaModule.shared.library,
        media: mediaModule.registry,
        mediaShared: {
            catalogEdit: mediaModule.shared.catalogEdit,
        },
        account: userModule.account,
        inactiveAccounts: userModule.inactiveAccounts,
        profile: userModule.profile,
        social: userModule.social,
        collections: userModule.collections,
        discovery: userModule.discovery,
        activity: userModule.activity,
        stats: userModule.stats,
        achievements: userModule.achievements,
        notifications: userModule.notifications,
        featureVotes: userModule.featureVotes,
        games: userModule.games,
        admin: adminModule.admin,
        imports: importModule,
    };
}


export function getContainer() {
    if (!containerPromise) {
        containerPromise = initContainer().then((container) => container);
    }
    return containerPromise;
}
