import React from "react";
import {isAtLeastRole, RoleType} from "@/lib/utils/enums";
import {AdminSidebar} from "@/lib/client/components/admin/AdminSidebar";
import {createFileRoute, notFound, Outlet} from "@tanstack/react-router";
import {authOptions} from "@/lib/client/react-query/query-options";
import {SidebarInset, SidebarProvider, SidebarTrigger} from "@/lib/client/components/ui/sidebar";


export const Route = createFileRoute("/_admin")({
    beforeLoad: ({ context: { queryClient } }) => {
        const currentUser = queryClient.getQueryData(authOptions.queryKey);
        if (!currentUser || !isAtLeastRole(currentUser.role, RoleType.ADMIN)) {
            throw notFound();
        }
    },
    head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
    component: AdminLayout,
});


function AdminLayout() {
    return (
        <>
            <SidebarProvider>
                <AdminSidebar/>
                <SidebarInset>
                    <header className="fixed flex h-12 shrink-0 items-center gap-2 px-2">
                        <SidebarTrigger className="-ml-1"/>
                    </header>
                    <div className="flex flex-col gap-4 p-4 pb-0 mt-8">
                        <Outlet/>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </>
    );
}
