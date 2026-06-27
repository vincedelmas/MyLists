import {useState} from "react";
import {Maximize2} from "lucide-react";
import {UpdateType} from "@/lib/utils/enums";
import {Button} from "@/lib/client/components/ui/button";
import {Textarea} from "@/lib/client/components/ui/textarea";
import {Separator} from "@/lib/client/components/ui/separator";
import {StructuredComment} from "@/lib/client/components/media/base/StructuredComment";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";


interface CommentaryProps {
    disabled?: boolean;
    content: string | null | undefined;
    updateComment: ReturnType<typeof useUpdateUserMediaMutation>;
}


export const UpdateComment = ({ content, updateComment, disabled = false }: CommentaryProps) => {
    const [comment, setComment] = useState(content);
    const readableDialogComment = comment ?? content;
    const [isEditing, setIsEditing] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [isDialogEditing, setIsDialogEditing] = useState(false);
    const shouldShowExpandedReader = !!content && content.trim().length >= 280;

    const handleEditToggle = () => {
        if (disabled) return;
        if (!isEditing) setComment(content);
        setIsEditing(!isEditing);
    };

    const handleDialogOpenChange = (open: boolean) => {
        setDialogOpen(open);
        if (!open) {
            setComment(content);
            setIsDialogEditing(false);
        }
    };

    const handleOpenExpandedReader = () => {
        if (disabled) return;
        setComment(content);
        setDialogOpen(true);
        setIsDialogEditing(false);
    };

    const handleDialogEditToggle = () => {
        setComment(content);
        setIsDialogEditing(!isDialogEditing);
    };

    const handleSave = (onSuccess?: () => void) => {
        if (content === comment) return;
        updateComment.mutate({ payload: { comment: comment, type: UpdateType.COMMENT } }, {
            onSuccess: () => {
                setIsEditing(false);
                setIsDialogEditing(false);
                onSuccess?.();
            },
        });
    };

    return (
        <>
            <h4 className="text-lg flex justify-between items-center mt-4 font-semibold">
                Comment
                <div className="flex items-center gap-1 text-muted-foreground text-sm mt-1">
                    {shouldShowExpandedReader && !isEditing &&
                        <Button variant="ghost" size="xs" onClick={handleOpenExpandedReader}>
                            <Maximize2 className="size-3.5"/>
                        </Button>
                    }
                    <Button size="bare" type="button" variant="invisible" disabled={disabled} onClick={handleEditToggle} className="disabled:opacity-40">
                        {content ? "Edit" : "Add"}
                    </Button>
                </div>
            </h4>
            <Separator className="-mt-2 mb-1"/>
            {isEditing ?
                <>
                    <Textarea
                        value={comment ?? ""}
                        disabled={updateComment.isPending}
                        className="w-full h-35 scrollbar-thin"
                        onChange={(ev) => setComment(ev.target.value)}
                        placeholder={"Enter your comment, you can:\n\n- Add bullet points\n- Leave blank lines between paragraphs"}
                    />
                    <div className="flex justify-end gap-2 mt-2">
                        <Button variant="outline" size="sm" onClick={handleEditToggle} disabled={updateComment.isPending}>
                            Cancel
                        </Button>
                        <Button size="sm" onClick={() => handleSave()} disabled={(content === comment) || updateComment.isPending}>
                            Save
                        </Button>
                    </div>
                </>
                :
                <div className="text-muted-foreground text-sm wrap-break-word max-h-37 overflow-y-auto scrollbar-thin pr-1">
                    {content
                        ? <StructuredComment content={content}/>
                        : "No comments added yet."
                    }
                </div>
            }

            <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
                <DialogContent className="max-h-[90vh] gap-3 overflow-hidden sm:max-w-2xl">
                    <DialogHeader>
                        <div className="flex items-center justify-between gap-3 pr-6">
                            <DialogTitle>Comment</DialogTitle>
                            {!isDialogEditing &&
                                <Button variant="ghost" size="sm" onClick={handleDialogEditToggle} disabled={updateComment.isPending}>
                                    Edit
                                </Button>
                            }
                        </div>
                        <DialogDescription className="sr-only">
                            Full comment view
                        </DialogDescription>
                    </DialogHeader>
                    {isDialogEditing ?
                        <>
                            <Textarea
                                value={comment ?? ""}
                                disabled={updateComment.isPending}
                                className="min-h-80 max-h-[65vh] scrollbar-thin"
                                onChange={(ev) => setComment(ev.target.value)}
                                placeholder={"Enter your comment, you can:\n\n- Add bullet points\n- Leave blank lines between paragraphs"}
                            />
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={handleDialogEditToggle} disabled={updateComment.isPending}>
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => handleSave()}
                                    disabled={(content === comment) || updateComment.isPending}
                                >
                                    Save
                                </Button>
                            </div>
                        </>
                        :
                        <div className="max-h-[70vh] overflow-y-auto pr-4 text-sm leading-relaxed scrollbar-thin sm:text-base -mr-3">
                            {readableDialogComment &&
                                <StructuredComment
                                    className="wrap-break-word"
                                    content={readableDialogComment}
                                />
                            }
                        </div>
                    }
                </DialogContent>
            </Dialog>
        </>
    );
};
