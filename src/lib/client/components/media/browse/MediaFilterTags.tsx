import {useId, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {Check, Pen, Plus, Search, Tags, Trash2, X} from "lucide-react";
import {cn} from "@/lib/utils/classnames";
import {MediaType, TagAction} from "@/lib/utils/enums";
import type {UserTag} from "@/lib/types/media-list.types";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {useDebounce} from "@/lib/client/hooks/use-debounce";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import {Alert, AlertDescription} from "@/lib/client/components/ui/alert";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {Field, FieldDescription, FieldGroup, FieldLabel} from "@/lib/client/components/ui/field";
import {InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput} from "@/lib/client/components/ui/input-group";
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
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const trimmedSearch = search.trim();
    const debouncedSearch = useDebounce(trimmedSearch, 250);
    const { data, error, isPending, isFetching, refetch } = useQuery({
        ...tagsViewOptions(mediaType, username, { search: debouncedSearch || undefined, page }),
        enabled,
    });
    const canCreate = isOwner && !!trimmedSearch && trimmedSearch === debouncedSearch && !!data && !data.exactMatch;

    const handleCreate = () => {
        if (!canCreate || mutation.isPending || isFetching) return;
        mutation.mutate({ tag: { name: trimmedSearch }, action: TagAction.ADD }, {
            onSuccess: () => {
                setSearch("");
                setPage(1);
            },
        });
    };

    return (
        <FieldGroup>
            <Field>
                <InputGroup>
                    <InputGroupAddon>
                        <Search aria-hidden="true"/>
                    </InputGroupAddon>
                    <InputGroupInput
                        type="search"
                        value={search}
                        disabled={mutation.isPending}
                        aria-label="Search tags"
                        placeholder={isOwner ? "Find or create a tag..." : "Find a tag..."}
                        onChange={ev => {
                            setSearch(ev.target.value);
                            setPage(1);
                        }}
                        onKeyDown={ev => {
                            if (ev.key === "Enter") {
                                ev.preventDefault();
                                handleCreate();
                            }
                            if (ev.key === "Escape" && search) {
                                ev.preventDefault();
                                ev.stopPropagation();
                                setSearch("");
                                setPage(1);
                            }
                        }}
                    />
                    {canCreate &&
                        <InputGroupAddon align="inline-end">
                            <InputGroupButton
                                variant="default"
                                onClick={handleCreate}
                                disabled={mutation.isPending || isFetching}
                            >
                                <Plus data-icon="inline-start"/>
                                Create tag
                            </InputGroupButton>
                        </InputGroupAddon>
                    }
                </InputGroup>
                <FieldDescription>
                    Match any selected tag. Apply filters to update the list.
                </FieldDescription>
            </Field>

            {selected.length > 0 &&
                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                        {selected.length} selected
                    </p>
                    <Button type="button" size="xs" variant="ghost" disabled={mutation.isPending} onClick={() => onChange([])}>
                        Clear selected tags
                    </Button>
                </div>
            }

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
                : data.items.length === 0 ?
                <EmptyState
                    icon={Tags}
                    className="py-12 text-center"
                    message={debouncedSearch ? `No tags matching “${debouncedSearch}”.` : "No tags created yet."}
                />
                : <FieldGroup className="gap-2">
                    {data.items.map(tag =>
                        <FilterTagRow
                            key={tag.tagName}
                            tag={tag}
                            isOwner={isOwner}
                            checked={selected.includes(tag.tagName)}
                            disabled={mutation.isPending}
                            onSelect={checked => onChange(checked
                                ? [...selected, tag.tagName]
                                : selected.filter(name => name !== tag.tagName)
                            )}
                            onRename={async name => {
                                await mutation.mutateAsync({ tag: { oldName: tag.tagName, name }, action: TagAction.RENAME });
                                onTagChange({ oldName: tag.tagName, newName: name });
                                setPage(1);
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
                                    setPage(1);
                                }
                                catch {
                                    // The mutation displays the error and keeps the tag selected.
                                }
                            }}
                        />
                    )}
                </FieldGroup>
            }

            {data &&
                <Pagination
                    maxVisible={5}
                    currentPage={data.page}
                    totalPages={data.pages}
                    onChangePage={setPage}
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
    onSelect: (checked: boolean) => void;
    onRename: (name: string) => Promise<void>;
    onDelete: () => void;
}


const FilterTagRow = ({ tag, checked, isOwner, disabled, onSelect, onRename, onDelete }: FilterTagRowProps) => {
    const fieldId = useId();
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

    return (
        <Field
            orientation="horizontal"
            data-disabled={disabled}
            className={cn("rounded-lg border p-3", checked && "border-brand/40 bg-brand/5")}
        >
            <Checkbox
                id={fieldId}
                aria-label={tag.tagName}
                aria-labelledby={isEditing ? undefined : `${fieldId}-name`}
                aria-describedby={isEditing ? undefined : `${fieldId}-count`}
                checked={checked}
                disabled={disabled}
                onCheckedChange={onSelect}
            />
            {isEditing ?
                <div className="flex min-w-0 flex-1 items-center gap-1">
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
                    <Button type="button" size="icon-sm" variant="ghost" disabled={disabled} aria-label="Save tag name" onClick={() => void handleRename()}>
                        <Check/>
                    </Button>
                    <Button type="button" size="icon-sm" variant="ghost" disabled={disabled} aria-label="Cancel rename" onClick={() => setIsEditing(false)}>
                        <X/>
                    </Button>
                </div>
                : <>
                    <FieldLabel htmlFor={fieldId} className="min-w-0 flex-1 cursor-pointer">
                        <span className="flex min-w-0 flex-col gap-1">
                            <span id={`${fieldId}-name`} className="truncate">
                                {tag.tagName}
                            </span>
                            <span id={`${fieldId}-count`} className="text-xs font-normal text-muted-foreground">
                                {tag.totalCount} media
                            </span>
                        </span>
                        {tag.medias.length > 0 &&
                            <span className="flex shrink-0" aria-hidden="true">
                                {tag.medias.map(item =>
                                    <img
                                        alt=""
                                        loading="lazy"
                                        key={item.mediaId}
                                        src={item.mediaCover}
                                        className="h-10 w-7 rounded border border-background object-cover [&:not(:first-child)]:-ml-3"
                                    />
                                )}
                            </span>
                        }
                    </FieldLabel>
                    {isOwner &&
                        <div className="flex shrink-0 items-center gap-1">
                            <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                disabled={disabled}
                                aria-label={`Rename ${tag.tagName}`}
                                onClick={() => {
                                    setEditName(tag.tagName);
                                    setIsEditing(true);
                                }}
                            >
                                <Pen/>
                            </Button>
                            <Button
                                type="button"
                                size="icon-sm"
                                disabled={disabled}
                                variant="destructiveGhost"
                                aria-label={`Delete ${tag.tagName}`}
                                onClick={onDelete}
                            >
                                <Trash2/>
                            </Button>
                        </div>
                    }
                </>
            }
        </Field>
    );
};
