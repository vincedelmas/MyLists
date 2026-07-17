import {AdminService} from "@/lib/server/domain/admin/admin.service";
import {AdminRepository} from "@/lib/server/domain/admin/admin.repository";


export function setupAdminModule() {
    const adminRepository = AdminRepository;
    return {
        admin: new AdminService(adminRepository),
    };
}

export type AdminModule = ReturnType<typeof setupAdminModule>;
