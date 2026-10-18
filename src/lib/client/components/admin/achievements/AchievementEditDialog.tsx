import {useId, type SubmitEvent} from "react";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {Textarea} from "@/lib/client/components/ui/textarea";
import type {Achievement} from "@/lib/types/achievements.types";
import {Field, FieldGroup, FieldLabel} from "@/lib/client/components/ui/field";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";
import {useAdminUpdateAchievementMutation, useAdminUpdateTiersMutation} from "@/lib/client/react-query/query-mutations/admin.mutations";


export type AchievementEdit = {
    achievement: Achievement,
    mode: "details" | "tiers",
};


export function AchievementEditDialog({ achievement, mode, onClose }: AchievementEdit & { onClose: () => void }) {
    const fieldId = useId();
    const tiersMutation = useAdminUpdateTiersMutation();
    const detailsMutation = useAdminUpdateAchievementMutation();
    const mutation = mode === "details" ? detailsMutation : tiersMutation;

    const handleSubmit = (ev: SubmitEvent<HTMLFormElement>) => {
        ev.preventDefault();
        const data = new FormData(ev.currentTarget);

        if (mode === "details") {
            detailsMutation.mutate({
                data: {
                    achievementId: achievement.id,
                    name: String(data.get("name")).trim(),
                    description: String(data.get("description")).trim(),
                }
            }, { onSuccess: onClose });
        }
        else {
            tiersMutation.mutate({
                data: {
                    tiers: achievement.tiers.map(tier => ({
                        ...tier,
                        criteria: { count: Number(data.get(`tier-${tier.id}`)) },
                    }))
                }
            }, { onSuccess: onClose });
        }
    };

    return (
        <Dialog
            open
            onOpenChange={open => {
                if (!open && !mutation.isPending) {
                    onClose();
                }
            }}
        >
            <DialogContent showCloseButton={!mutation.isPending} className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {mode === "details"
                            ? "Edit achievement"
                            : "Edit tier thresholds"
                        }
                    </DialogTitle>
                    <DialogDescription>
                        {mode === "details"
                            ? `Update the name and description for ${achievement.name}.`
                            : `Set the required count for each tier of ${achievement.name}.`
                        }
                    </DialogDescription>
                </DialogHeader>
                <form
                    className="flex flex-col gap-6"
                    aria-busy={mutation.isPending}
                    onSubmit={handleSubmit}
                >
                    <FieldGroup>
                        {mode === "details" ?
                            <>
                                <Field data-disabled={mutation.isPending}>
                                    <FieldLabel htmlFor={`${fieldId}-name`}>
                                        Name
                                    </FieldLabel>
                                    <Input
                                        name="name"
                                        id={`${fieldId}-name`}
                                        required pattern=".*\S.*"
                                        disabled={mutation.isPending}
                                        defaultValue={achievement.name}
                                    />
                                </Field>
                                <Field data-disabled={mutation.isPending}>
                                    <FieldLabel htmlFor={`${fieldId}-description`}>
                                        Description
                                    </FieldLabel>
                                    <Textarea
                                        required
                                        name="description"
                                        id={`${fieldId}-description`}
                                        disabled={mutation.isPending}
                                        defaultValue={achievement.description}
                                    />
                                </Field>
                            </>
                            :
                            achievement.tiers.map(tier =>
                                <Field key={tier.id} orientation="horizontal" data-disabled={mutation.isPending}>
                                    <FieldLabel htmlFor={`${fieldId}-tier-${tier.id}`} className="flex-1 capitalize">
                                        {tier.difficulty}
                                    </FieldLabel>
                                    <Input
                                        min={0}
                                        step={1}
                                        required
                                        type="number"
                                        className="w-32"
                                        name={`tier-${tier.id}`}
                                        disabled={mutation.isPending}
                                        id={`${fieldId}-tier-${tier.id}`}
                                        defaultValue={tier.criteria.count}
                                    />
                                </Field>
                            )}
                    </FieldGroup>

                    {mutation.isError &&
                        <p role="alert" className="text-sm text-destructive">
                            {mutation.error.message}
                        </p>
                    }

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
                            Cancel
                        </Button>
                        <FormSubmitButton isLoading={mutation.isPending}>
                            Save changes
                        </FormSubmitButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
