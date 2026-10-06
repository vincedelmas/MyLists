import type {ReactNode, SubmitEventHandler} from "react";
import {FieldGroup} from "@/lib/client/components/ui/field";
import {Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle} from "@/lib/client/components/ui/sheet";


interface MediaFiltersSheetProps {
    open: boolean;
    title: string;
    footer: ReactNode;
    children: ReactNode;
    description: ReactNode;
    onOpenChange: (open: boolean) => void;
    onSubmit: SubmitEventHandler<HTMLFormElement>;
}


export const MediaFiltersSheet = ({ open, title, description, children, footer, onOpenChange, onSubmit }: MediaFiltersSheetProps) => {
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
                    <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                        {children}
                    </FieldGroup>

                    <SheetFooter>
                        {footer}
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}
