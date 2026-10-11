import {useState} from "react";
import {Check, Pen, Trash2, X} from "lucide-react";
import type {UserTag} from "@/lib/types/media-list.types";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {Field} from "@/lib/client/components/ui/field";
import {ActionsMenu} from "@/lib/client/components/general/ActionsMenu";
import {MediaTagChoice} from "@/lib/client/components/media/browse/MediaTagChoice";
import {DropdownMenuGroup, DropdownMenuItem} from "@/lib/client/components/ui/dropdown-menu";


interface MediaFilterTagRowProps {
    tag: UserTag;
    checked: boolean;
    isOwner: boolean;
    disabled: boolean;
    onSelect: () => void;
    onDelete: () => void;
    onRename: (name: string) => Promise<void>;
}


export const MediaFilterTagRow = ({ tag, checked, isOwner, disabled, onSelect, onRename, onDelete }: MediaFilterTagRowProps) => {
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
                disabled={disabled}
                aria-label="Save tag name"
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
                onClick={() => setIsEditing(false)}
            >
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
