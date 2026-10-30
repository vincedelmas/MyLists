import {useState} from "react";
import {Pencil} from "lucide-react";
import {TvMediaType} from "@/lib/utils/enums";
import {Button} from "@/lib/client/components/ui/button";
import {TvSeasonEditor} from "@/lib/client/components/media/tv/TvSeasonEditor";
import {MediaSaveFeedback} from "@/lib/client/components/media/base/MediaSaveFeedback";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";


interface UpdateTvRedoProps {
    redo: number;
    userId: number;
    mediaId: number;
    mediaType: TvMediaType;
    onUpdateMutation: ReturnType<typeof useUpdateUserMediaMutation>;
}


export const UpdateTvRedo = ({ redo, onUpdateMutation, ...source }: UpdateTvRedoProps) => {
    const [open, setOpen] = useState(false);

    return (
        <>
            <MediaSaveFeedback mutation={onUpdateMutation} field={["redo", "seasonRedos"]}>
                {saveDisabled => (
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={saveDisabled}
                        onClick={() => setOpen(true)}
                        className="w-34 justify-between bg-input/30"
                    >
                        {redo} Seasons
                        <Pencil/>
                    </Button>
                )}
            </MediaSaveFeedback>

            <TvSeasonEditor
                {...source}
                open={open}
                mode={"redo"}
                onOpenChange={setOpen}
                mutation={onUpdateMutation}
            />
        </>
    );
};
