import type {ReactNode} from "react";
import {PlusCircle} from "lucide-react";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {displayContainerError} from "@/lib/client/error-display";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";
import {DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";


interface MembershipDialogContentProps {
    title: string;
    search: ReactNode;
    footer: ReactNode;
    isLoading: boolean;
    emptyTitle: string;
    error: Error | null;
    children: ReactNode[];
    description: ReactNode;
    emptyDescription: ReactNode;
}


export const MembershipDialogContent = (props: MembershipDialogContentProps) => {
    const { title, description, search, isLoading, emptyTitle, emptyDescription, error, footer, children } = props;

    return (
        <DialogContent className="w-100 p-0 overflow-hidden bg-popover shadow-2xl max-sm:w-full">
            <div className="p-6 pb-4">
                <DialogHeader className="p-0 mb-6 mt-2">
                    <DialogTitle>
                        {title}
                    </DialogTitle>
                    <DialogDescription>
                        {description}
                    </DialogDescription>
                </DialogHeader>
                {search}
            </div>

            <div className="flex flex-col border-t bg-accent/20">
                <div className="h-70 overflow-y-auto p-2 scrollbar-thin">
                    {isLoading ?
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                            <Spinner className="size-6" aria-hidden="true"/>
                            <span className="text-xs font-medium">
                                Syncing...
                            </span>
                        </div>
                        :
                        children.length === 0 ?
                            <div className="flex flex-col items-center justify-center h-full text-center p-6">
                                <PlusCircle className="size-8 text-muted-foreground mb-3 opacity-50"/>
                                <p className="text-sm text-muted-foreground font-medium">
                                    {emptyTitle}
                                </p>
                                <p className="text-xs text-muted-foreground/70 mt-1">
                                    {emptyDescription}
                                </p>
                            </div>
                            :
                            <div className="grid gap-0.5">
                                {children}
                            </div>
                    }
                </div>

                {error &&
                    <div className="mb-3 mt-1 px-2">
                        <InlineErrorContainer>
                            {displayContainerError({ error })}
                        </InlineErrorContainer>
                    </div>
                }

                <div className="p-4 border-t flex items-center justify-between bg-popover">
                    {footer}
                </div>
            </div>
        </DialogContent>
    );
}
