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
    repositories: UserModule["repositories"] & ImportModule["repositories"];
    services: UserModule["services"] & ImportModule["services"] & AdminModule["services"];
    registries: ImportModule["registries"] & ProviderModule["registries"];
    library: MediaModule["library"];
    features: MediaModule["features"] & UserModule["features"] & ProviderModule["features"];
}


let containerPromise: Promise<AppContainer> | null = null;


async function initContainer(): Promise<AppContainer> {
    const cacheManager = await setupCacheManager();
    const clientsModule = await setupApiClientsModule();

    const mediaModule = setupMediaModule();
    const adminService = setupAdminModule();
    const userModule = setupUserModule(mediaModule);
    const providerModule = setupProviderModule(clientsModule);

    const importModule = setupImportModule(mediaModule, providerModule);

    return {
        cacheManager,
        apiClients: clientsModule,
        repositories: {
            ...userModule.repositories,
            ...importModule.repositories,
        },
        services: {
            ...userModule.services,
            ...importModule.services,
            ...adminService.services,
        },
        registries: {
            ...importModule.registries,
            ...providerModule.registries,
        },
        library: mediaModule.library,
        features: {
            ...mediaModule.features,
            ...userModule.features,
            ...providerModule.features,
        },
    };
}


export function getContainer() {
    if (!containerPromise) {
        containerPromise = initContainer().then((container) => container);
    }
    return containerPromise;
}
