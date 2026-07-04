import {useState} from "react";
import {UpdateType} from "@/lib/utils/enums";
import {Button} from "@/lib/client/components/ui/button";
import {MinusCircle, Pencil, PlusCircle} from "lucide-react";
import {Separator} from "@/lib/client/components/ui/separator";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {Credenza, CredenzaContent, CredenzaDescription, CredenzaFooter, CredenzaHeader, CredenzaTitle} from "@/lib/client/components/ui/credenza";


interface UpdateTvRedoProps {
    redoValues: number[];
    onUpdateMutation: ReturnType<typeof useUpdateUserMediaMutation>;
}


export const UpdateTvRedo = ({ onUpdateMutation, redoValues }: UpdateTvRedoProps) => {
    const [open, setOpen] = useState(false);
    const [draftRedo, setDraftRedo] = useState<number[]>([]);
    const totalRedo = redoValues.reduce((a, b) => a + b, 0);

    const onOpenChange = (open: boolean) => {
        setOpen(open);
        if (open) {
            setDraftRedo([...redoValues]);
        }
    };

    const updateSeason = (idx: number, value: number) => {
        setDraftRedo((prevSeasons) => prevSeasons.map((s, i) => (i === idx ? Math.max(0, s + value) : s)));
    };

    const updateAllSeasons = (value: number) => {
        setDraftRedo((prevSeasons) => prevSeasons.map((s) => Math.max(0, s + value)));
    };

    const onUpdateRedoValues = () => {
        setOpen(false);
        onUpdateMutation.mutate({ payload: { redo2: draftRedo, type: UpdateType.REDO } });
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
                            <div className="flex items-center">
                                <Button variant="ghost" size="icon" onClick={() => updateAllSeasons(-1)} className="mr-2">
                                    <MinusCircle className="size-5"/>
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => updateAllSeasons(1)}>
                                    <PlusCircle className="size-5"/>
                                </Button>
                            </div>
                        </div>
                        <Separator className="mb-3"/>
                        <div className="overflow-y-auto scrollbar-thin max-h-73">
                            {draftRedo.map((season, idx) =>
                                <div key={idx} className="flex justify-between items-center px-3">
                                    <div className="flex items-center gap-6">
                                        <div className="font-semibold">
                                            Season {idx + 1}:
                                        </div>
                                        <div>{season}x</div>
                                    </div>
                                    <div className="flex items-center">
                                        <Button variant="ghost" size="icon" onClick={() => updateSeason(idx, -1)} className="mr-2">
                                            <MinusCircle className="size-5"/>
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => updateSeason(idx, 1)}>
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
