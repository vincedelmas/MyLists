import {SlidersHorizontal, Tags} from "lucide-react";
import type {ReactNode, SubmitEventHandler} from "react";
import {FieldGroup} from "@/lib/client/components/ui/field";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/lib/client/components/ui/tabs";
import {Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle} from "@/lib/client/components/ui/sheet";


export type MediaFiltersTab = "filters" | "tags";


interface MediaFiltersSheetProps {
    open: boolean;
    title: string;
    tags?: ReactNode;
    footer: ReactNode;
    children: ReactNode;
    description: ReactNode;
    activeTab: MediaFiltersTab;
    onOpenChange: (open: boolean) => void;
    onTabChange: (tab: MediaFiltersTab) => void;
    onSubmit: SubmitEventHandler<HTMLFormElement>;
}


export const MediaFiltersSheet = (props: MediaFiltersSheetProps) => {
    const { open, title, description, children, footer, tags, activeTab, onTabChange, onOpenChange, onSubmit } = props;
    
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
                    {tags ?
                        <Tabs value={activeTab} onValueChange={onTabChange} className="flex-1">
                            <div className="shrink-0 px-4">
                                <TabsList aria-label="Filter sections">
                                    <TabsTrigger value="filters">
                                        <SlidersHorizontal data-icon="inline-start" aria-hidden="true"/> Filters
                                    </TabsTrigger>
                                    <TabsTrigger value="tags">
                                        <Tags data-icon="inline-start" aria-hidden="true"/> Tags
                                    </TabsTrigger>
                                </TabsList>
                            </div>
                            <TabsContent value="filters" render={<FieldGroup className="min-h-0 flex-1 overflow-y-auto scrollbar-thin p-4"/>}>
                                {children}
                            </TabsContent>
                            <TabsContent value="tags" render={<FieldGroup className="min-h-0 flex-1 overflow-y-auto scrollbar-thin p-4"/>}>
                                {tags}
                            </TabsContent>
                        </Tabs>
                        :
                        <FieldGroup className="min-h-0 flex-1 overflow-y-auto scrollbar-thin p-4">
                            {children}
                        </FieldGroup>
                    }

                    <SheetFooter>
                        {footer}
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}
