import React, {ReactNode, useId} from "react";
import {Search, SlidersHorizontal} from "lucide-react";
import {Badge} from "@/lib/client/components/ui/badge";
import {Button} from "@/lib/client/components/ui/button";
import {FieldError} from "@/lib/client/components/ui/field";
import {Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from "@/lib/client/components/ui/dialog";


interface AdvancedSearchDialogFrameProps {
    open: boolean;
    title: string;
    formError?: string;
    children: ReactNode;
    activeCount: number;
    onClear: () => void;
    onOpenChange: (open: boolean) => void;
    triggerVariant?: "compact" | "default";
    onSubmit: React.SubmitEventHandler<HTMLFormElement>;
}


export const AdvancedSearchDialogFrame = (props: AdvancedSearchDialogFrameProps) => {
    const formId = useId();
    const { open, title, children, onClear, onSubmit, activeCount, formError, onOpenChange, triggerVariant = "default" } = props;

    const handleClear = () => {
        onClear();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger
                render={
                    <Button
                        type="button"
                        size={triggerVariant === "compact" ? "icon-sm" : "default"}
                        className={triggerVariant === "compact" ? "relative" : undefined}
                        aria-label={`${title}${activeCount > 0 ? `, ${activeCount} active filters` : ""}`}
                        variant={activeCount > 0 ? "secondary" : triggerVariant === "compact" ? "ghost" : "outline"}
                    />
                }
            >
                <SlidersHorizontal data-icon="inline-start"/>

                {triggerVariant === "default" && "Advanced"}

                {activeCount > 0 &&
                    <Badge
                        variant={triggerVariant === "compact" ? "default" : "outline"}
                        className={triggerVariant === "compact" ? "absolute -top-1.5 -right-1.5 size-4 px-0" : "ml-0.5"}
                    >
                        {activeCount}
                    </Badge>
                }
            </DialogTrigger>

            <DialogContent
                onClick={(ev) => ev.stopPropagation()}
                className="max-h-[calc(100dvh-1rem)] overflow-hidden scrollbar-thin sm:max-w-2xl"
            >
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        Build the full query here. Nothing is requested until you press Search.
                    </DialogDescription>
                </DialogHeader>

                <form id={formId} onSubmit={onSubmit} className="contents">
                    <div className="-mx-1 max-h-[52dvh] overflow-y-auto px-1 py-1 sm:max-h-[65vh]">
                        {children}
                    </div>

                    {formError &&
                        <FieldError>
                            {formError}
                        </FieldError>
                    }

                    <DialogFooter className="flex-row justify-end py-3">
                        {activeCount > 0 &&
                            <Button type="button" size="sm" variant="ghost" onClick={handleClear}>
                                Clear filters
                            </Button>
                        }

                        <DialogClose render={<Button type="button" size="sm" variant="outline"/>}>
                            Cancel
                        </DialogClose>

                        <Button type="submit" size="sm" form={formId}>
                            <Search data-icon="inline-start"/>
                            Search
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
