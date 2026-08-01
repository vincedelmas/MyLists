import {Tag} from "@/lib/types/media-common.types";
import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {useQueryClient} from "@tanstack/react-query";
import {Badge} from "@/lib/client/components/ui/badge";
import {Separator} from "@/lib/client/components/ui/separator";
import {TagsDialog} from "@/lib/client/components/media/base/TagsDialog";
import {UserMediaQueryOption} from "@/lib/client/react-query/query-mutations/user-media.mutations";


interface TagListsProps {
    tags: Tag[];
    mediaId: number;
    mediaType: MediaType;
    queryOption: UserMediaQueryOption;
}


export const TagsLists = ({ queryOption, mediaType, mediaId, tags }: TagListsProps) => {
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    const updateTagNames = (newTagsList: (Tag | undefined)[]) => {
        if (queryOption.queryKey[0] === "details") {
            queryClient.setQueryData(queryOption.queryKey, (oldData) => {
                if (!oldData) return;

                return {
                    ...oldData,
                    userMedia: Object.assign({}, oldData.userMedia, { tags: newTagsList }),
                };
            })
        }
        else if (queryOption.queryKey[0] === "userList") {
            queryClient.setQueryData(queryOption.queryKey, (oldData) => {
                if (!oldData) return;
                return {
                    ...oldData,
                    results: Object.assign({}, oldData.results, {
                        items: oldData.results.items.map((m) =>
                            m.mediaId === mediaId ? Object.assign({}, m, { tags: newTagsList }) : m
                        )
                    }),
                };
            });
        }
    };

    return (
        <div className="mt-5">
            <h4 className="text-md flex justify-between items-center font-medium">
                <span>Tags</span>
                <TagsDialog
                    tags={tags}
                    mediaId={mediaId}
                    mediaType={mediaType}
                    updateTag={updateTagNames}
                />
            </h4>
            <Separator/>
            <div className="flex flex-wrap gap-1 mt-1">
                {tags.length === 0 ?
                    <div className="mt-1 text-muted-foreground text-sm">
                        Not tag added yet.
                    </div>
                    :
                    tags.map((tag) =>
                        <Link
                            key={tag.name}
                            search={{ tags: [tag.name] }}
                            to="/list/$mediaType/$username"
                            params={{ mediaType, username: currentUser!.name }}
                        >
                            <Badge key={tag.name} variant="tag" className="max-w-50">
                                # {tag.name}
                            </Badge>
                        </Link>
                    )
                }
            </div>
        </div>
    );
};
