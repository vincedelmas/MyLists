import {useId, useState} from "react";
import {cn} from "@/lib/utils/classnames";
import {Link} from "@tanstack/react-router";
import {useQuery} from "@tanstack/react-query";
import {ChevronRight, Tags} from "lucide-react";
import {Tag} from "@/lib/types/media-common.types";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {MediaType, TagAction} from "@/lib/utils/enums";
import {Button} from "@/lib/client/components/ui/button";
import {DialogRootChangeEventDetails} from "@base-ui/react";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import {Field, FieldLabel} from "@/lib/client/components/ui/field";
import {tagNamesOptions} from "@/lib/client/react-query/query-options";
import {Dialog, DialogTrigger} from "@/lib/client/components/ui/dialog";
import {MembershipSearchInput} from "@/lib/client/components/media/base/MembershipSearchInput";
import {useEditTagMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {MembershipDialogContent} from "@/lib/client/components/media/base/MembershipDialogContent";


interface TagsDialogProps {
    tags: Tag[];
    mediaId: number;
    mediaType: MediaType;
    updateTag: (tags: Tag[]) => void;
}


export const TagsDialog = ({ mediaType, mediaId, tags, updateTag }: TagsDialogProps) => {
    const fieldId = useId();
    const { currentUser } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const mutation = useEditTagMutation(mediaType, mediaId, { noErrorToast: true });
    const { data: allTags = [], isLoading, error } = useQuery(tagNamesOptions(mediaType, isOpen));

    const query = searchQuery.trim().toLowerCase();
    const activeNames = new Set(tags.map(tag => tag.name));
    const filteredTags = allTags.filter(tag => tag.name.toLowerCase().includes(query));
    const showCreateButton = !error && !isLoading && query.length > 0 && !allTags.some(tag => tag.name.toLowerCase() === query);

    const handleAction = (tag: Tag, action: TagAction) => {
        mutation.mutate({ tag, action }, {
            onSuccess: () => {
                if (action === TagAction.ADD) {
                    updateTag([...tags, tag]);
                    setSearchQuery("");
                }
                else {
                    updateTag(tags.filter(item => item.name !== tag.name));
                }
            },
        });
    };

    const onOpenChange = (open: boolean, ev: DialogRootChangeEventDetails) => {
        if (!open && ev.reason === "escape-key" && searchQuery.length > 0) {
            ev.cancel();
            setSearchQuery("");
            return;
        }
        setIsOpen(open);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogTrigger render={<Button type="button" size="bare" variant="ghost" className="text-xs text-muted-foreground"/>}>
                Manage
            </DialogTrigger>
            <MembershipDialogContent
                title="Manage Tags"
                isLoading={isLoading}
                emptyTitle="No tag found"
                error={error ?? mutation.error}
                description={<>Add this {mediaType} to your tags to organize your list.</>}
                emptyDescription={searchQuery
                    ? `Click 'create' to create '${searchQuery.trim()}' tag.`
                    : "Start typing to create your first tag."}
                search={
                    <MembershipSearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        canCreate={showCreateButton}
                        isCreating={mutation.isPending}
                        placeholder="Find or create a tag..."
                        disabled={isLoading || !!error || mutation.isPending}
                        onCreate={() => handleAction({ name: searchQuery.trim() }, TagAction.ADD)}
                    />
                }
                footer={
                    <>
                        <Link
                            search={{ filtersTab: "tags" }}
                            to="/lists/tracking/$mediaType/$username"
                            params={{ mediaType, username: currentUser!.name }}
                            className="flex items-center gap-1.5 text-xs text-foreground/90 hover:text-brand transition-colors"
                        >
                            <Tags className="size-3"/>
                            Open Tags
                            <ChevronRight className="size-3 -ml-1"/>
                        </Link>
                        <Button size="sm" variant="secondary" onClick={() => setIsOpen(false)}>
                            Done
                        </Button>
                    </>
                }
            >
                {filteredTags.map((tag, idx) => {
                    const checkboxId = `${fieldId}-${idx}`;
                    const isActive = activeNames.has(tag.name);

                    return (
                        <Field
                            key={tag.name}
                            orientation="horizontal"
                            data-disabled={!!error || mutation.isPending}
                            className={cn("p-3 rounded-lg", isActive ? "bg-brand/4 text-brand" : "hover:bg-popover")}
                        >
                            <Checkbox
                                id={checkboxId}
                                checked={isActive}
                                disabled={!!error || mutation.isPending}
                                onCheckedChange={() => handleAction(tag, isActive ? TagAction.DELETE_ONE : TagAction.ADD)}
                            />
                            <FieldLabel htmlFor={checkboxId} className="min-w-0 cursor-pointer">
                                # {tag.name}
                            </FieldLabel>
                        </Field>
                    );
                })}
            </MembershipDialogContent>
        </Dialog>
    );
};
