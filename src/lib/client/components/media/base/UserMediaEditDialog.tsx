import {UserMediaItem} from "@/lib/types/query.options.types";
import {MediaType} from "@/lib/utils/enums";
import {UserMediaDetails} from "@/lib/client/components/media/base/UserMediaDetails";
import {mediaListOptions} from "@/lib/client/react-query/query-options";
import {Credenza, CredenzaContent, CredenzaDescription, CredenzaHeader, CredenzaTitle} from "@/lib/client/components/ui/credenza";
import {assertNever} from "@/lib/utils/assert-never";


interface UserMediaEditDialogProps {
    dialogOpen: boolean;
    userMedia: UserMediaItem;
    onOpenChange: (open: boolean) => void;
    queryOption: ReturnType<typeof mediaListOptions>;
}


export const UserMediaEditDialog = ({ dialogOpen, userMedia, queryOption, onOpenChange }: UserMediaEditDialogProps) => {
    return (
        <Credenza open={dialogOpen} onOpenChange={onOpenChange}>
            <CredenzaContent className="w-108 max-sm:w-full">
                <CredenzaHeader>
                    <CredenzaTitle>
                        {userMedia.mediaName}
                    </CredenzaTitle>
                    <CredenzaDescription>
                        Here you can edit your media details
                    </CredenzaDescription>
                </CredenzaHeader>
                <div className="w-full flex items-center justify-center max-sm:mb-8 max-sm:px-2">
                    <ListEntryEditor userMedia={userMedia} queryOption={queryOption}/>
                </div>
            </CredenzaContent>
        </Credenza>
    );
};


const ListEntryEditor = ({ userMedia, queryOption }: Pick<UserMediaEditDialogProps, "userMedia" | "queryOption">) => {
    switch (userMedia.kind) {
        case MediaType.SERIES:
            return <UserMediaDetails userMedia={userMedia} queryOption={queryOption}
                progressMetadata={{ kind: MediaType.SERIES, seasons: userMedia.seasons }}/>;
        case MediaType.ANIME:
            return <UserMediaDetails userMedia={userMedia} queryOption={queryOption}
                progressMetadata={{ kind: MediaType.ANIME, seasons: userMedia.seasons }}/>;
        case MediaType.MOVIES:
            return <UserMediaDetails userMedia={userMedia} queryOption={queryOption}
                progressMetadata={{ kind: MediaType.MOVIES }}/>;
        case MediaType.GAMES:
            return <UserMediaDetails userMedia={userMedia} queryOption={queryOption}
                progressMetadata={{ kind: MediaType.GAMES }}/>;
        case MediaType.BOOKS:
            return <UserMediaDetails userMedia={userMedia} queryOption={queryOption}
                progressMetadata={{ kind: MediaType.BOOKS, pages: userMedia.pages }}/>;
        case MediaType.MANGA:
            return <UserMediaDetails userMedia={userMedia} queryOption={queryOption}
                progressMetadata={{ kind: MediaType.MANGA, chapters: userMedia.chapters }}/>;
        default:
            return assertNever(userMedia, "list entry family");
    }
};
