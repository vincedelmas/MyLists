import {MediaTagBrowser} from "@/lib/client/components/media/browse/MediaTagBrowser";
import {ActionsMenu} from "@/lib/client/components/general/ActionsMenu";
import {DropdownMenuGroup, DropdownMenuItem} from "@/lib/client/components/ui/dropdown-menu";
import {MediaTagChoice} from "@/lib/client/components/media/browse/MediaTagChoice";
import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {Check, Pen, Trash2, X} from "lucide-react";
import {MediaType, TagAction} from "@/lib/utils/enums";
import type {UserTag} from "@/lib/types/media-list.types";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {Alert, AlertDescription} from "@/lib/client/components/ui/alert";
import {Field, FieldGroup} from "@/lib/client/components/ui/field";
import {tagsViewOptions} from "@/lib/client/react-query/query-options";
import {useEditTagMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


export interface MediaTagChange {
    oldName: string;
    newName?: string;
}


interface MediaFilterTagsProps {
    enabled: boolean;
    isOwner: boolean;
    username: string;
    mediaType: MediaType;
    selected: string[];
    onChange: (selected: string[]) => void;
    onTagChange: (change: MediaTagChange) => void;
}


export const MediaFilterTags = ({ enabled, isOwner, username, mediaType, selected, onChange, onTagChange }: MediaFilterTagsProps) => {
    const confirm = useConfirm();
    const mutation = useEditTagMutation(mediaType);
    const { data, error, isPending, refetch } = useQuery({
        ...tagsViewOptions(mediaType, username),
        enabled,
    });

    return (
        <FieldGroup>
            {error ?
                <Alert variant="destructive">
                    <AlertDescription>
                        We couldn’t load tags.
                        <Button type="button" size="sm" variant="ghost" onClick={() => void refetch()}>
                            Try again
                        </Button>
                    </AlertDescription>
                </Alert>
                : isPending ?
                    <div role="status" aria-label="Loading tags" className="flex justify-center py-12">
                        <Spinner className="size-8"/>
                    </div>
                    : <MediaTagBrowser
                        label="Tags"
                        value={selected}
                        onChange={onChange}
                        disabled={mutation.isPending}
                        options={data.map(tag => tag.tagName)}
                        onCreate={isOwner ? async name => {
                            await mutation.mutateAsync({ tag: { name }, action: TagAction.ADD });
                        } : undefined}
                        renderChoice={(name, checked, onSelect) => {
                            const tag = data.find(tag => tag.tagName === name)!;
                            return (
                                <FilterTagRow
                                    tag={tag}
                                    isOwner={isOwner}
                                    checked={checked}
                                    onSelect={onSelect}
                                    disabled={mutation.isPending}
                                    onRename={async name => {
                                        await mutation.mutateAsync({ tag: { oldName: tag.tagName, name }, action: TagAction.RENAME });
                                        onTagChange({ oldName: tag.tagName, newName: name });
                                    }}
                                    onDelete={async () => {
                                        if (!await confirm({
                                            variant: "destructive",
                                            confirmLabel: "Delete tag",
                                            title: `Delete "${tag.tagName}"?`,
                                            description: "This tag will be removed from matching list items.",
                                        })) return;
                                        try {
                                            await mutation.mutateAsync({ tag: { name: tag.tagName }, action: TagAction.DELETE_ALL });
                                            onTagChange({ oldName: tag.tagName });
                                        }
                                        catch {
                                            // The mutation displays the error and keeps the tag selected.
                                        }
                                    }}
                                />
                            );
                        }}
                    />
            }
        </FieldGroup>
    );
};


interface FilterTagRowProps {
    tag: UserTag;
    checked: boolean;
    isOwner: boolean;
    disabled: boolean;
    onSelect: () => void;
    onDelete: () => void;
    onRename: (name: string) => Promise<void>;
}


const FilterTagRow = ({ tag, checked, isOwner, disabled, onSelect, onRename, onDelete }: FilterTagRowProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(tag.tagName);

    const handleRename = async () => {
        const name = editName.trim();
        if (!name) return;
        try {
            if (name !== tag.tagName) await onRename(name);
            setIsEditing(false);
        }
        catch {
            // Keep the entered name available when the mutation fails.
        }
    };

    if (isEditing) return (
        <Field orientation="horizontal" data-disabled={disabled} className="min-w-0 rounded-lg border p-2">
            <Input
                autoFocus
                value={editName}
                disabled={disabled}
                aria-label="New tag name"
                onChange={ev => setEditName(ev.target.value)}
                onKeyDown={ev => {
                    if (ev.key === "Enter") {
                        ev.preventDefault();
                        void handleRename();
                    }
                    if (ev.key === "Escape") {
                        ev.preventDefault();
                        ev.stopPropagation();
                        setIsEditing(false);
                    }
                }}
            />
            <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                disabled={disabled} aria-label="Save tag name"
                onClick={() => void handleRename()}
            >
                <Check/>
            </Button>
            <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                disabled={disabled}
                aria-label="Cancel rename"
                onClick={() => setIsEditing(false)}>
                <X/>
            </Button>
        </Field>
    );

    return (
        <MediaTagChoice
            selected={checked}
            label={tag.tagName}
            disabled={disabled}
            onSelect={onSelect}
            count={tag.totalCount}
            title={`${tag.totalCount} media`}
            actions={
                isOwner &&
                <ActionsMenu label={`Actions for ${tag.tagName}`}>
                    <DropdownMenuGroup>
                        <DropdownMenuItem
                            disabled={disabled}
                            onClick={() => {
                                setEditName(tag.tagName);
                                setIsEditing(true);
                            }}
                        >
                            <Pen/>Rename {tag.tagName}
                        </DropdownMenuItem>

                        <DropdownMenuItem disabled={disabled} variant="destructive" onClick={onDelete}>
                            <Trash2/>Delete {tag.tagName}
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                </ActionsMenu>
            }
        />
    );
};
