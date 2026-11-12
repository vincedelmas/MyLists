import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {Plus, Tag as TagIcon} from "lucide-react";
import {Tag} from "@/lib/types/media-common.types";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Badge} from "@/lib/client/components/ui/badge";
import {Button} from "@/lib/client/components/ui/button";
import {TagsDialog} from "@/lib/client/components/media/base/TagsDialog";


interface TagListsProps {
    tags: Tag[];
    mediaId: number;
    mediaType: MediaType;
}


export const TagsLists = ({ mediaType, mediaId, tags }: TagListsProps) => {
    const { currentUser } = useAuth();

    return (
        <div className="mt-5">
            <h4 className="mb-1 flex items-center justify-between text-sm font-medium">
                <span>Tags</span>
                <TagsDialog
                    tags={tags}
                    mediaId={mediaId}
                    mediaType={mediaType}
                    trigger={
                        <Button size="icon-sm" variant="ghost" aria-label="Manage tags">
                            <TagIcon/>
                        </Button>
                    }
                />
            </h4>
            <div className="flex flex-wrap items-center gap-1.5">
                {tags.length === 0 ?
                    <div className="text-muted-foreground text-xs">
                        No tags added yet.
                    </div>
                    :
                    tags.map((tag) =>
                        <Link
                            key={tag.name}
                            search={{ tags: [tag.name] }}
                            to="/lists/tracking/$mediaType/$username"
                            params={{ mediaType, username: currentUser!.name }}
                        >
                            <Badge variant="outline" className="max-w-50 rounded-sm text-xs py-2.5">
                                # {tag.name}
                            </Badge>
                        </Link>
                    )
                }
                <TagsDialog
                    tags={tags}
                    mediaId={mediaId}
                    mediaType={mediaType}
                    trigger={
                        <Button size="icon-xs" variant="dashed" aria-label="Add tags">
                            <Plus/>
                        </Button>
                    }
                />
            </div>
        </div>
    );
};
