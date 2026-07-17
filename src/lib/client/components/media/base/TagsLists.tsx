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

    const updateTagNames = (_newTagsList: (Tag | undefined)[]) => {
        if (queryOption.queryKey[0] === "details") {
            void queryClient.invalidateQueries({ queryKey: queryOption.queryKey });
        }
        else if (queryOption.queryKey[0] === "userList") {
            void queryClient.invalidateQueries({ queryKey: queryOption.queryKey });
        }
    };

    return (
        <>
            <h4 className="text-lg flex justify-between items-center mt-5 font-semibold">
                Tags
                <TagsDialog
                    tags={tags}
                    mediaId={mediaId}
                    mediaType={mediaType}
                    updateTag={updateTagNames}
                />
            </h4>
            <Separator className="mb-1"/>
            <div className="flex flex-wrap gap-2">
                {tags.length === 0 ?
                    <div className="text-muted-foreground text-sm">
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
                            <Badge key={tag.name} variant="emerald" className="max-w-50">
                                <div className="flex justify-between gap-2">
                                    # {tag.name}
                                </div>
                            </Badge>
                        </Link>
                    )
                }
            </div>
        </>
    );
};
