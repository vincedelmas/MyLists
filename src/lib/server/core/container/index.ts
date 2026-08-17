import {CacheManager, setupCacheManager} from "@/lib/server/core/cache-manager";
import {AdminModule, setupAdminModule} from "@/lib/server/core/container/admin.module";
import {MediaModule, setupMediaModule} from "@/lib/server/core/container/media.module";
import {ImportModule, setupImportModule} from "@/lib/server/core/container/import.module";
import {AccountModule, setupAccountModule} from "@/lib/server/core/container/account.module";
import {FeatureModule, setupFeatureModule} from "@/lib/server/core/container/feature.module";
import {ProviderModule, setupProviderModule} from "@/lib/server/core/container/provider.module";
import {setupTrackingModule, TrackingModule} from "@/lib/server/core/container/tracking.module";
import {ApiClientModule, setupApiClientsModule} from "@/lib/server/core/container/api-client.module";


interface AppContainer {
    cacheManager: CacheManager;
    apiClients: ApiClientModule;
    registries: MediaModule["registries"] & ImportModule["registries"] & ProviderModule["registries"];
    repositories: AccountModule["repositories"] & FeatureModule["repositories"] & TrackingModule["repositories"] & ImportModule["repositories"];
    services: AccountModule["services"] & FeatureModule["services"] & TrackingModule["services"] & ImportModule["services"] & AdminModule["services"];
}


let containerPromise: Promise<AppContainer> | null = null;


async function initContainer(): Promise<AppContainer> {
    const cacheManager = await setupCacheManager();
    const clientsModule = await setupApiClientsModule();

    const mediaModule = setupMediaModule();
    const adminService = setupAdminModule();
    const accountModule = setupAccountModule(mediaModule);
    const featureModule = setupFeatureModule(mediaModule, accountModule);
    const trackingModule = setupTrackingModule(mediaModule, featureModule);
    const providerModule = setupProviderModule(mediaModule, clientsModule);

    const importModule = setupImportModule(mediaModule, providerModule);

    return {
        cacheManager,
        apiClients: clientsModule,
        repositories: {
            ...accountModule.repositories,
            ...featureModule.repositories,
            ...trackingModule.repositories,
            ...importModule.repositories,
        },
        services: {
            ...accountModule.services,
            ...featureModule.services,
            ...trackingModule.services,
            ...importModule.services,
            ...adminService.services,
        },
        registries: {
            ...mediaModule.registries,
            ...importModule.registries,
            ...providerModule.registries,
        },
    };
}


export function getContainer() {
    if (!containerPromise) {
        containerPromise = initContainer().then((container) => container);
    }
    return containerPromise;
}
