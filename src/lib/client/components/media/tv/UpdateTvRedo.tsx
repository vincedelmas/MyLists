import {useState} from "react";
import {UpdateType} from "@/lib/utils/enums";
import {REDO_MAX} from "@/lib/utils/constants";
import {Button} from "@/lib/client/components/ui/button";
import {MinusCircle, Pencil, PlusCircle} from "lucide-react";
import {Separator} from "@/lib/client/components/ui/separator";
import {ButtonGroup} from "@/lib/client/components/ui/button-group";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";


interface UpdateTvRedoProps {
    seasonCount: number;
    redoValues: number[];
    onUpdateMutation: ReturnType<typeof useUpdateUserMediaMutation>;
}


export const UpdateTvRedo = ({ onUpdateMutation, redoValues, seasonCount }: UpdateTvRedoProps) => {
    const [open, setOpen] = useState(false);
    const [draftRedo, setDraftRedo] = useState<number[]>([]);

    const checkedRedoValues = Array.from({ length: seasonCount }, (_, index) => redoValues[index] ?? 0);
    const totalRedo = checkedRedoValues.reduce((a, b) => a + b, 0);

    const onOpenChange = (open: boolean) => {
        setOpen(open);
        if (open) {
            setDraftRedo(checkedRedoValues);
        }
    };

    const updateSeason = (idx: number, value: number) => {
        setDraftRedo(prev => prev.map((s, i) => i === idx ? Math.min(REDO_MAX, Math.max(0, s + value)) : s));
    };

    const updateAllSeasons = (value: number) => {
        setDraftRedo(prev => prev.map((s) => Math.min(REDO_MAX, Math.max(0, s + value))));
    };

    const onUpdateRedoValues = () => {
        setOpen(false);
        onUpdateMutation.mutate({ payload: { redo2: draftRedo, type: UpdateType.REDO } });
    };

    return (
        <>
            <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() => onOpenChange(true)}
                className="w-34 justify-between bg-input/30 hover:bg-input/50"
            >
                <div className="text-sm">
                    {totalRedo} Seasons
                </div>
                <Pencil className="text-muted-foreground"/>
            </Button>

            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="w-90 max-sm:w-full max-sm:pb-5">
                    <DialogHeader>
                        <DialogTitle>Re-watched Seasons Manager</DialogTitle>
                        <DialogDescription>Manage your re-watched seasons</DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center justify-between pr-2.5">
                        <span className="font-semibold">
                            All Seasons
                        </span>
                        <ButtonGroup aria-label="Adjust all seasons rewatch count">
                            <Button
                                size="icon"
                                variant="outline"
                                aria-label="Decrease all seasons rewatch count"
                                onClick={() => updateAllSeasons(-1)}
                                disabled={draftRedo.every((s) => s <= 0)}
                            >
                                <MinusCircle/>
                            </Button>
                            <Button
                                size="icon"
                                variant="outline"
                                aria-label="Increase all seasons rewatch count"
                                onClick={() => updateAllSeasons(1)}
                                disabled={draftRedo.every((s) => s >= REDO_MAX)}
                            >
                                <PlusCircle/>
                            </Button>
                        </ButtonGroup>
                    </div>

                    <Separator/>

                    <div className="max-h-70 overflow-x-hidden overflow-y-auto scrollbar-thin scrollbar-gutter-stable">
                        {draftRedo.map((season, idx) =>
                            <div key={idx} className="flex justify-between items-center not-last:mb-2">
                                <div className="flex items-center gap-6">
                                    <div className="font-semibold">
                                        Season {idx + 1}:
                                    </div>
                                    <div>{season}x</div>
                                </div>
                                <ButtonGroup aria-label={`Adjust season ${idx + 1} rewatch count`}>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        disabled={season <= 0}
                                        onClick={() => updateSeason(idx, -1)}
                                        aria-label={`Decrease season ${idx + 1} rewatch count`}
                                        className="transition-colors active:not-aria-[haspopup]:translate-y-0"
                                    >
                                        <MinusCircle/>
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        disabled={season >= REDO_MAX}
                                        onClick={() => updateSeason(idx, 1)}
                                        aria-label={`Increase season ${idx + 1} rewatch count`}
                                        className="transition-colors active:not-aria-[haspopup]:translate-y-0"
                                    >
                                        <PlusCircle/>
                                    </Button>
                                </ButtonGroup>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" className="w-full" onClick={onUpdateRedoValues} disabled={onUpdateMutation.isPending}>
                            Update
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
