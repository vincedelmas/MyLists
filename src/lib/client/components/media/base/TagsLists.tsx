import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {Tag} from "@/lib/types/media-common.types";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Badge} from "@/lib/client/components/ui/badge";
import {Separator} from "@/lib/client/components/ui/separator";
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
            <h4 className="text-md flex justify-between items-center font-medium">
                <span>Tags</span>
                <TagsDialog
                    tags={tags}
                    mediaId={mediaId}
                    mediaType={mediaType}
                />
            </h4>
            <Separator/>
            <div className="flex flex-wrap gap-1 mt-1">
                {tags.length === 0 ?
                    <div className="mt-1 text-muted-foreground text-sm">
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
                            <Badge variant="tag" className="max-w-50">
                                # {tag.name}
                            </Badge>
                        </Link>
                    )
                }
            </div>
        </div>
    );
};
