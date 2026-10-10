import type {ReactNode, SubmitEventHandler} from "react";
import {SlidersHorizontal, Tags} from "lucide-react";
import {FieldGroup} from "@/lib/client/components/ui/field";
import {TabHeader} from "@/lib/client/components/general/TabHeader";
import {Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle} from "@/lib/client/components/ui/sheet";


export type MediaFiltersTab = "filters" | "tags";


interface MediaFiltersSheetProps {
    open: boolean;
    title: string;
    footer: ReactNode;
    children: ReactNode;
    description: ReactNode;
    tags?: ReactNode;
    activeTab: MediaFiltersTab;
    onTabChange: (tab: MediaFiltersTab) => void;
    onOpenChange: (open: boolean) => void;
    onSubmit: SubmitEventHandler<HTMLFormElement>;
}


export const MediaFiltersSheet = ({ open, title, description, children, footer, tags, activeTab, onTabChange, onOpenChange, onSubmit }: MediaFiltersSheetProps) => {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="max-sm:w-full">
                <SheetHeader>
                    <SheetTitle>
                        {title}
                    </SheetTitle>
                    <SheetDescription className="flex items-center gap-2">
                        {description}
                    </SheetDescription>
                </SheetHeader>
                <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
                    {tags &&
                        <div className="shrink-0 px-4">
                            <TabHeader
                                value={activeTab}
                                onValueChange={onTabChange}
                                tabs={[
                                    { id: "filters" as const, label: "Filters", icon: <SlidersHorizontal className="size-4"/> },
                                    { id: "tags" as const, label: "Tags", icon: <Tags className="size-4"/> },
                                ]}
                            />
                        </div>
                    }
                    <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                        {tags && activeTab === "tags" ? tags : children}
                    </FieldGroup>

                    <SheetFooter>
                        {footer}
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}
