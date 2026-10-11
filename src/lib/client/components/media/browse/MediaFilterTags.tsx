import {useQuery} from "@tanstack/react-query";
import {MediaType, TagAction} from "@/lib/utils/enums";
import {Button} from "@/lib/client/components/ui/button";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {FieldGroup} from "@/lib/client/components/ui/field";
import {tagsViewOptions} from "@/lib/client/react-query/query-options";
import {Alert, AlertDescription} from "@/lib/client/components/ui/alert";
import {MediaTagBrowser} from "@/lib/client/components/media/browse/MediaTagBrowser";
import {MediaFilterTagRow} from "@/lib/client/components/media/browse/MediaFilterTagRow";
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

    const tagsByName = new Map(data?.map(tag => [tag.tagName, tag]));

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
                            const tag = tagsByName.get(name)!;
                            return (
                                <MediaFilterTagRow
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
