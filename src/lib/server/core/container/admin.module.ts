import {createAdminService} from "@/lib/server/domain/admin/admin.service";
import {adminRepository} from "@/lib/server/domain/admin/admin.repository";


export function setupAdminModule() {
    return {
        services: {
            admin: createAdminService(adminRepository),
        },
    };
}

export type AdminModule = ReturnType<typeof setupAdminModule>;
