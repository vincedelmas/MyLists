import {useState} from "react";
import {Maximize2, MessageCircle} from "lucide-react";
import {Button} from "@/lib/client/components/ui/button";
import {StructuredComment} from "@/lib/client/components/media/base/StructuredComment";
import {Popover, PopoverContent, PopoverTrigger} from "@/lib/client/components/ui/popover";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";


interface DisplayCommentProps {
    size?: number;
    content?: string;
}


export const DisplayComment = ({ content, size = 15 }: DisplayCommentProps) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const shouldShowExpandedReader = !!content && content.trim().length >= 280;

    const handleOpenExpandedReader = () => {
        setPopoverOpen(false);
        setDialogOpen(true);
    };

    return (
        <>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger>
                    <MessageCircle
                        size={size}
                        className="text-info"
                    />
                </PopoverTrigger>
                <PopoverContent align="center" side="top" className="max-h-[60vh] min-w-80 overflow-y-auto scrollbar-thin">
                    {shouldShowExpandedReader &&
                        <div className="flex justify-end -mt-2.5 -mr-2.5">
                            <Button variant="ghost" size="xs" onClick={handleOpenExpandedReader}>
                                <Maximize2 className="size-3.5"/>
                            </Button>
                        </div>
                    }
                    {content &&
                        <StructuredComment
                            content={content}
                            className="wrap-break-word text-sm leading-relaxed"
                        />
                    }
                    {shouldShowExpandedReader &&
                        <div className="flex justify-end -mr-2.5">
                            <Button variant="ghost" size="xs" onClick={handleOpenExpandedReader}>
                                <Maximize2 className="size-3.5"/>
                            </Button>
                        </div>
                    }
                </PopoverContent>
            </Popover>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-h-[90vh] gap-3 overflow-hidden sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Comment</DialogTitle>
                        <DialogDescription className="sr-only">
                            Full comment view
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto pr-4 text-sm leading-relaxed scrollbar-thin sm:text-base -mr-3">
                        {content &&
                            <StructuredComment
                                content={content}
                                className="wrap-break-word"
                            />
                        }
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};
