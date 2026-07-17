import {CacheManager, setupCacheManager} from "@/lib/server/core/cache-manager";
import {setupUserModule, UserModule} from "@/lib/server/core/container/user.module";
import {AdminModule, setupAdminModule} from "@/lib/server/core/container/admin.module";
import {MediaModule, setupMediaModule} from "@/lib/server/core/container/media.module";
import {ImportModule, setupImportModule} from "@/lib/server/core/container/import.module";
import {ProviderModule, setupProviderModule} from "@/lib/server/core/container/provider.module";
import {ApiClientModule, setupApiClientsModule} from "@/lib/server/core/container/api-client.module";


interface AppContainer {
    cacheManager: CacheManager;
    apiClients: ApiClientModule;
    imports: ImportModule;
    stats: UserModule["stats"];
    games: UserModule["games"];
    admin: AdminModule["admin"];
    media: MediaModule["media"];
    social: UserModule["social"];
    account: UserModule["account"];
    profile: UserModule["profile"];
    library: MediaModule["library"];
    activity: UserModule["activity"];
    discovery: UserModule["discovery"];
    collections: UserModule["collections"];
    featureVotes: UserModule["featureVotes"];
    achievements: UserModule["achievements"];
    notifications: UserModule["notifications"];
    inactiveAccounts: UserModule["inactiveAccounts"];
    catalog: {
        ingestion: ProviderModule["ingestion"];
        externalProviders: ProviderModule["externalProviders"];
    };
}


let containerPromise: Promise<AppContainer> | null = null;


async function initContainer(): Promise<AppContainer> {
    const cacheManager = await setupCacheManager();
    const clientsModule = await setupApiClientsModule();

    const mediaModule = setupMediaModule();
    const adminModule = setupAdminModule();
    const userModule = setupUserModule(mediaModule);
    const providerModule = setupProviderModule(clientsModule);

    const importModule = setupImportModule(mediaModule, providerModule);

    return {
        cacheManager,
        apiClients: clientsModule,
        library: mediaModule.library,
        media: mediaModule.media,
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
        catalog: {
            externalProviders: providerModule.externalProviders,
            ingestion: providerModule.ingestion,
        },
    };
}


export function getContainer() {
    if (!containerPromise) {
        containerPromise = initContainer().then((container) => container);
    }
    return containerPromise;
}
