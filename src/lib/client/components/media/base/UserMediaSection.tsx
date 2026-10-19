import {Plus} from "lucide-react";
import {MediaType} from "@/lib/utils/enums";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {Card, CardContent} from "@/lib/client/components/ui/card";
import {userMediaDetailsOptions} from "@/lib/client/react-query/query-options";
import {UserMediaDetails} from "@/lib/client/components/media/base/UserMediaDetails";
import {useAddMediaToListMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


interface UserMediaSectionProps {
    mediaId: number;
    listEdit?: boolean;
    mediaType: MediaType;
}


export const UserMediaSection = ({ mediaType, mediaId, listEdit = false }: UserMediaSectionProps) => {
    const queryOption = userMediaDetailsOptions(mediaType, mediaId);

    const { data } = useSuspenseQuery(queryOption);
    const addMediaToListMutation = useAddMediaToListMutation(queryOption);

    if (data.userMedia) {
        return (
            <UserMediaDetails
                media={data.media}
                listEdit={listEdit}
                mediaType={mediaType}
                queryOption={queryOption}
                userMedia={data.userMedia}
            />
        );
    }

    if (listEdit) return (
        <p>This title is no longer in your list.</p>
    );

    return (
        <Card>
            <CardContent className="flex flex-col gap-4 text-center">
                <div className="flex flex-col gap-3">
                    <h3 className="text-lg font-semibold text-foreground">
                        Are you interested in this?
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Add this {mediaType} to your list to track your progress.
                    </p>
                </div>
                <Button
                    className="w-full"
                    disabled={addMediaToListMutation.isPending}
                    onClick={() => addMediaToListMutation.mutate({ data: { mediaType, mediaId } })}
                >
                    <Plus data-icon="inline-start"/> Add to List
                </Button>
            </CardContent>
        </Card>
    );
};
