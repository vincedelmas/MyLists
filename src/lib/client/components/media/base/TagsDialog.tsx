import {cn} from "@/lib/utils/classnames";
import {Link} from "@tanstack/react-router";
import React, {useId, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {Tag} from "@/lib/types/media-common.types";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Input} from "@/lib/client/components/ui/input";
import {MediaType, TagAction} from "@/lib/utils/enums";
import {Button} from "@/lib/client/components/ui/button";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import {displayContainerError} from "@/lib/utils/error-display";
import {Field, FieldLabel} from "@/lib/client/components/ui/field";
import {tagNamesOptions} from "@/lib/client/react-query/query-options";
import {ChevronRight, Pencil, PlusCircle, Tags} from "lucide-react";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {useEditTagMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {Credenza, CredenzaContent, CredenzaDescription, CredenzaHeader, CredenzaTitle, CredenzaTrigger} from "@/lib/client/components/ui/credenza";


interface TagsDialogProps {
    tags: Tag[];
    mediaId: number;
    mediaType: MediaType;
    updateTag: (tags: (Tag | undefined)[]) => void;
}


export const TagsDialog = ({ mediaType, mediaId, tags, updateTag }: TagsDialogProps) => {
    const fieldId = useId();
    const { currentUser } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const mutation = useEditTagMutation(mediaType, mediaId, { noErrorToast: true });
    const { data: allTags = [], isLoading } = useQuery(tagNamesOptions(mediaType, isOpen));

    const activeIds = new Set(tags.map((c) => c.name));
    const filteredTags = allTags.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const showCreateButton = searchQuery.trim().length > 0
        && !allTags.some((c) => c.name.toLowerCase() === searchQuery.trim().toLowerCase());

    const handleAction = (tag: Tag, action: TagAction) => {
        mutation.mutate({ tag, action }, {
            onSuccess: (data) => {
                if (action === TagAction.ADD) {
                    updateTag([...tags, data]);
                    setSearchQuery("");
                }
                else {
                    updateTag(tags.filter((c) => c.name !== tag.name));
                }
            },
        });
    };

    const onSearchKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>) => {
        if (ev.key === "Enter" && showCreateButton) {
            handleAction({ name: searchQuery.trim() }, TagAction.ADD);
        }
    }

    return (
        <Credenza open={isOpen} onOpenChange={setIsOpen}>
            <CredenzaTrigger className="text-muted-foreground">
                <Button type="button" size="bare" variant="ghost" className="text-xs">
                    <Pencil className="mr-1"/> Manage
                </Button>
            </CredenzaTrigger>
            <CredenzaContent
                className="w-100 p-0 overflow-hidden bg-popover shadow-2xl max-sm:w-full"
                onEscapeKeyDown={(ev) => {
                    if (searchQuery.length > 0) {
                        ev.preventDefault();
                        setSearchQuery("");
                    }
                }}
            >
                <div className="p-6 pb-4">
                    <CredenzaHeader className="p-0 mb-6 mt-2">
                        <CredenzaTitle>
                            Manage Tags
                        </CredenzaTitle>
                        <CredenzaDescription>
                            Add this {mediaType} to your tags to organize your list.
                        </CredenzaDescription>
                    </CredenzaHeader>

                    <div className="relative group">
                        <Input
                            autoFocus
                            value={searchQuery}
                            disabled={isLoading}
                            onKeyDown={onSearchKeyDown}
                            className="h-9 bg-popover/50"
                            placeholder="Find or create a tag..."
                            onChange={(ev) => setSearchQuery(ev.target.value)}
                        />
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 flex items-center">
                            {showCreateButton ?
                                <Button
                                    size="sm"
                                    variant="default"
                                    className="text-[10px]"
                                    onClick={() => handleAction({ name: searchQuery.trim() }, TagAction.ADD)}
                                >
                                    {mutation.isPending ? "..." : "CREATE"}
                                </Button>
                                :
                                <div className="px-2 py-1 rounded bg-popover/50 border text-[10px] text-muted-foreground font-mono tracking-tighter">
                                    ESC
                                </div>
                            }
                        </div>
                    </div>
                </div>

                <div className="flex flex-col border-t bg-accent/20">
                    <div className="h-70 overflow-y-auto p-2 scrollbar-thin">
                        {isLoading ?
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                                <Spinner className="size-6" aria-hidden="true"/>
                                <span className="text-xs font-medium">Syncing...</span>
                            </div>
                            : filteredTags.length === 0 ?
                                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                                    <PlusCircle className="size-8 text-muted-foreground mb-3 opacity-50"/>
                                    <p className="text-sm text-muted-foreground font-medium">
                                        No tag found
                                    </p>
                                    <p className="text-xs text-muted-foreground/70 mt-1">
                                        {searchQuery ?
                                            `Click 'create' to create '${searchQuery.trim()}' tags.`
                                            :
                                            "Start typing to create your first list."
                                        }
                                    </p>
                                </div>
                                :
                                <div className="grid gap-0.5">
                                    {filteredTags.map((col, idx) => {
                                        const checkboxId = `${fieldId}-${idx}`;
                                        const isActive = activeIds.has(col.name);

                                        return (
                                            <Field
                                                key={col.name}
                                                orientation="horizontal"
                                                data-disabled={mutation.isPending}
                                                className={cn("p-3 rounded-lg", isActive
                                                    ? "bg-brand/4 text-brand" : "hover:bg-popover"
                                                )}
                                            >
                                                <Checkbox
                                                    id={checkboxId}
                                                    checked={isActive}
                                                    disabled={mutation.isPending}
                                                    onCheckedChange={() => handleAction(col, isActive ? TagAction.DELETE_ONE : TagAction.ADD)}
                                                />
                                                <FieldLabel htmlFor={checkboxId} className="min-w-0 cursor-pointer">
                                                    # {col.name}
                                                </FieldLabel>
                                            </Field>
                                        );
                                    })}
                                </div>
                        }
                    </div>

                    {mutation.isError &&
                        <div className="mb-3 mt-1 px-2">
                            <InlineErrorContainer>
                                {displayContainerError({ error: mutation.error })}
                            </InlineErrorContainer>
                        </div>
                    }

                    <div className="p-4 border-t flex items-center justify-between bg-popover">
                        <Link
                            to="/list/$mediaType/$username/tags"
                            params={{ mediaType, username: currentUser!.name }}
                            className="flex items-center gap-1.5 text-xs text-foreground/90 hover:text-brand transition-colors"
                        >
                            <Tags className="size-3"/>
                            Open Tags
                            <ChevronRight className="size-3 mt-0.5"/>
                        </Link>
                        <Button size="sm" variant="secondary" onClick={() => setIsOpen(false)}>
                            Done
                        </Button>
                    </div>
                </div>
            </CredenzaContent>
        </Credenza>
    );
};
