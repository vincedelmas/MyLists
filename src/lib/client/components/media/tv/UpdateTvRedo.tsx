import {useState} from "react";
import {UpdateType} from "@/lib/utils/enums";
import {REDO_MAX} from "@/lib/utils/constants";
import {Button} from "@/lib/client/components/ui/button";
import {MinusCircle, Pencil, PlusCircle} from "lucide-react";
import {Separator} from "@/lib/client/components/ui/separator";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {Credenza, CredenzaContent, CredenzaDescription, CredenzaFooter, CredenzaHeader, CredenzaTitle} from "@/lib/client/components/ui/credenza";


interface UpdateTvRedoProps {
    rewatches: { seasonNumber: number; count: number }[];
    seasons: { seasonNumber: number; episodeCount: number }[];
    onUpdateMutation: ReturnType<typeof useUpdateUserMediaMutation>;
}


export const UpdateTvRedo = ({ onUpdateMutation, rewatches, seasons }: UpdateTvRedoProps) => {
    const [open, setOpen] = useState(false);
    const [draftRewatches, setDraftRewatches] = useState<{ seasonNumber: number; count: number }[]>([]);
    const totalRedo = rewatches.reduce((total, item) => total + item.count, 0);

    const onOpenChange = (open: boolean) => {
        setOpen(open);
        if (open) {
            const counts = new Map(rewatches.map(({ seasonNumber, count }) => [seasonNumber, count]));
            setDraftRewatches(seasons.map(({ seasonNumber }) => ({
                seasonNumber,
                count: counts.get(seasonNumber) ?? 0,
            })));
        }
    };

    const updateSeason = (seasonNumber: number, value: number) => {
        setDraftRewatches((previous) => previous.map((item) => item.seasonNumber === seasonNumber
            ? { ...item, count: Math.min(REDO_MAX, Math.max(0, item.count + value)) }
            : item));
    };

    const updateAllSeasons = (value: number) => {
        setDraftRewatches((previous) => previous.map((item) => ({
            ...item,
            count: Math.min(REDO_MAX, Math.max(0, item.count + value)),
        })));
    };

    const onUpdateRedoValues = () => {
        setOpen(false);
        onUpdateMutation.mutate({ payload: { rewatches: draftRewatches, type: UpdateType.REDO } });
    };

    return (
        <>
            <Button
                size="bare"
                type="button"
                variant="invisible"
                onClick={() => onOpenChange(true)}
                className="w-34 text-start flex items-center justify-between bg-accent/30 h-8 rounded-md border px-3"
            >
                <div className="text-sm">
                    {totalRedo} Seasons
                </div>
                <Pencil className="size-4 text-muted-foreground"/>
            </Button>
            <Credenza open={open} onOpenChange={onOpenChange}>
                <CredenzaContent className="w-100 max-sm:w-full max-sm:pb-5">
                    <CredenzaHeader>
                        <CredenzaTitle>Re-watched Seasons Manager</CredenzaTitle>
                        <CredenzaDescription>Manage your re-watched seasons</CredenzaDescription>
                    </CredenzaHeader>
                    <div className="mt-2">
                        <div className="flex justify-between items-center p-2 px-3">
                            <span className="font-semibold">All Seasons</span>
                            <div className="flex gap-3 items-center">
                                <Button
                                    size="bare"
                                    variant="invisible"
                                    onClick={() => updateAllSeasons(-1)}
                                    disabled={draftRewatches.every(({ count }) => count <= 0)}
                                >
                                    <MinusCircle className="size-5"/>
                                </Button>
                                <Button
                                    size="bare"
                                    variant="invisible"
                                    onClick={() => updateAllSeasons(1)}
                                    disabled={draftRewatches.every(({ count }) => count >= REDO_MAX)}
                                >
                                    <PlusCircle className="size-5"/>
                                </Button>
                            </div>
                        </div>
                        <Separator className="mb-3"/>
                        <div className="overflow-y-auto scrollbar-thin max-h-73">
                            {draftRewatches.map(({ seasonNumber, count }) =>
                                <div key={seasonNumber} className="flex justify-between items-center px-3">
                                    <div className="flex items-center gap-6">
                                        <div className="font-semibold">
                                            Season {seasonNumber}:
                                        </div>
                                        <div>{count}x</div>
                                    </div>
                                    <div className="flex gap-3 items-center">
                                        <Button
                                            size="bare"
                                            variant="invisible"
                                            disabled={count <= 0}
                                            onClick={() => updateSeason(seasonNumber, -1)}
                                        >
                                            <MinusCircle className="size-5"/>
                                        </Button>
                                        <Button
                                            size="bare"
                                            variant="invisible"
                                            disabled={count >= REDO_MAX}
                                            onClick={() => updateSeason(seasonNumber, 1)}
                                        >
                                            <PlusCircle className="size-5"/>
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <CredenzaFooter>
                        <Button type="button" className="w-full" onClick={onUpdateRedoValues} disabled={onUpdateMutation.isPending}>
                            Update
                        </Button>
                    </CredenzaFooter>
                </CredenzaContent>
            </Credenza>
        </>
    );
};
