import {FileSpreadsheet} from "lucide-react";
import {useIsMutating} from "@tanstack/react-query";
import {importSearchSchema} from "@/lib/schemas/imports.schema";
import {TabHeader} from "@/lib/client/components/general/TabHeader";
import {createFileRoute, Link, Outlet, useLocation} from "@tanstack/react-router";
import {ExistingImportsPanel} from "@/lib/client/components/user-settings/ExistingImportsPanel";


export const Route = createFileRoute("/_main/_private/settings/_layout/imports")({
    validateSearch: importSearchSchema,
    component: SettingsImportsLayout,
});


const sourceTabs = [
    {
        isAccent: true,
        label: "Letterboxd",
        id: "/settings/imports/letterboxd",
        icon: <FileSpreadsheet className="size-4"/>,
    },
    {
        isAccent: true,
        label: "IMDb",
        id: "/settings/imports/imdb",
        icon: <FileSpreadsheet className="size-4"/>,
    },
    {
        isAccent: true,
        label: "MyLists",
        id: "/settings/imports/mylists",
        icon: <FileSpreadsheet className="size-4"/>,
    },
] as const;


function SettingsImportsLayout() {
    const pathname = useLocation({ select: location => location.pathname });
    const activeTab = sourceTabs.find(tab => tab.id === pathname) ?? sourceTabs[0];

    const isUploading = useIsMutating({ mutationKey: ["imports", "create"] }) > 0;

    return (
        <div className="flex flex-col gap-8 -mt-2">
            <section className="flex flex-col gap-4">
                <TabHeader
                    tabs={sourceTabs}
                    value={activeTab.id}
                    renderTrigger={(tab, props) =>
                        <Link
                            {...props}
                            to={tab.id}
                            search={true}
                            resetScroll={false}
                            disabled={isUploading}
                        />
                    }
                />
                <Outlet/>
            </section>

            <ExistingImportsPanel/>
        </div>
    );
}
