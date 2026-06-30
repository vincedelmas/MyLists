import {useState} from "react";
import {AchievementTier} from "@/lib/schemas";
import {Badge} from "@/lib/client/components/ui/badge";
import {Input} from "@/lib/client/components/ui/input";
import {Label} from "@/lib/client/components/ui/label";
import {capitalize} from "@/lib/utils/text-formatting";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {Achievement} from "@/lib/types/achievements.types";
import {Textarea} from "@/lib/client/components/ui/textarea";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {DashboardHeader} from "@/lib/client/components/admin/DashboardHeader";
import {adminAchievementsOptions} from "@/lib/client/react-query/query-options/admin.options";
import {Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";
import {useAdminUpdateAchievementMutation, useAdminUpdateTiersMutation} from "@/lib/client/react-query/query-mutations/admin.mutations";


export const Route = createFileRoute("/_admin/admin/achievements")({
    loader: async ({ context: { queryClient } }) => {
        return queryClient.ensureQueryData(adminAchievementsOptions);
    },
    component: AchievementPage,
})


function AchievementPage() {
    const updateTiersMutation = useAdminUpdateTiersMutation();
    const [editedName, setEditedName] = useState("");
    const [editedDesc, setEditedDesc] = useState("");
    const apiData = useSuspenseQuery(adminAchievementsOptions).data;
    const updateAchievementMutation = useAdminUpdateAchievementMutation();
    const [editableTiers, setEditableTiers] = useState<AchievementTier[]>([]);
    const [isTierDialogOpen, setIsTierDialogOpen] = useState(false);
    const [editAchievementDialogOpen, setEditAchievementDialogOpen] = useState(false);
    const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);

    const editAchievement = (achievement: Achievement) => {
        setEditedName(achievement.name);
        setEditingAchievement(achievement);
        setEditedDesc(achievement.description);
        setEditAchievementDialogOpen(true);
    };

    const handleSaveChanges = async () => {
        if (!editingAchievement) return;

        setEditAchievementDialogOpen(false);
        updateAchievementMutation.mutate({
            data: {
                name: editedName,
                description: editedDesc,
                achievementId: editingAchievement.id,
            }
        });
    };

    const handleCancelAchievementEdit = () => {
        setEditAchievementDialogOpen(false);
    };

    const editTier = (achievement: Achievement) => {
        setIsTierDialogOpen(true);
        setEditingAchievement(achievement);
        setEditableTiers(achievement.tiers.map(tier => ({ ...tier, criteria: { ...tier.criteria } })));
    };

    const handleTierCountChange = (tierId: number, value: string) => {
        const count = parseInt(value, 10);

        setEditableTiers((currentTiers) => currentTiers.map((tier) => (tier.id === tierId) ?
            {
                ...tier,
                criteria: {
                    count: Number.isFinite(count) ? count : 0
                }
            }
            : tier
        ));
    };

    const handleSaveTierChanges = async () => {
        if (!editingAchievement) return;
        setIsTierDialogOpen(false);
        updateTiersMutation.mutate({ data: { tiers: editableTiers } });
    };

    const handleCancelTierEdit = () => {
        setIsTierDialogOpen(false);
    };

    return (
        <DashboardShell>
            <DashboardHeader
                heading="Achievements Manager"
                description="Manage the achievement definitions and associated tiers."
            />
            <div className="grid gap-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {apiData.map((achievement) =>
                        <Card key={achievement.id}>
                            <CardHeader>
                                <CardTitle>{achievement.name}</CardTitle>
                                <CardAction>
                                    <Badge variant="outline">
                                        {capitalize(achievement.mediaType)}
                                    </Badge>
                                </CardAction>
                                <CardDescription className="text-sm">
                                    {achievement.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="w-[60%]">
                                <div className="space-y-4">
                                    <h3 className="font-semibold">Achievement Tiers</h3>
                                    <div className="space-y-2">
                                        {achievement.tiers.map((tier) =>
                                            <div key={tier.difficulty} className="grid grid-cols-2 gap-2 text-sm">
                                                <div>{capitalize(tier.difficulty)}</div>
                                                <div>Criteria: {tier.criteria.count}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button size="sm" variant="outline" onClick={() => editAchievement(achievement)}>
                                    Edit Details
                                </Button>
                                <Button variant="secondary" size="sm" onClick={() => editTier(achievement)}>
                                    Edit Tiers
                                </Button>
                            </CardFooter>
                        </Card>
                    )}
                </div>
            </div>
            <Dialog open={editAchievementDialogOpen} onOpenChange={setEditAchievementDialogOpen}>
                <DialogContent className="sm:max-w-106">
                    <DialogHeader>
                        <DialogTitle>Edit Achievement Details</DialogTitle>
                        <DialogDescription>Modify the core details of the achievement.</DialogDescription>
                    </DialogHeader>
                    {editingAchievement &&
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Name</Label>
                                <Input
                                    id="name"
                                    value={editedName}
                                    className="col-span-3"
                                    disabled={updateAchievementMutation.isPending}
                                    onChange={(ev) => setEditedName(ev.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="description" className="text-right">Description</Label>
                                <Textarea
                                    id="description"
                                    value={editedDesc}
                                    className="col-span-3"
                                    disabled={updateAchievementMutation.isPending}
                                    onChange={(ev) => setEditedDesc(ev.target.value)}
                                />
                            </div>
                        </div>
                    }
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={handleCancelAchievementEdit}
                            disabled={updateAchievementMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSaveChanges} disabled={updateAchievementMutation.isPending || !editedName || !editedDesc}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={isTierDialogOpen} onOpenChange={setIsTierDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Tiers for: {editingAchievement?.name}</DialogTitle>
                        <DialogDescription>Adjust the criteria count for each difficulty tier.</DialogDescription>
                    </DialogHeader>
                    {editingAchievement && (
                        <div className="grid gap-4 py-4">
                            {editableTiers.map((tier) =>
                                <div key={tier.difficulty} className="grid grid-cols-3 items-center gap-4">
                                    <Label htmlFor={`tier-${tier.difficulty}`} className="text-right">
                                        {capitalize(tier.difficulty)}
                                    </Label>
                                    <Input
                                        min="0"
                                        type="number"
                                        className="col-span-2"
                                        id={tier.id.toString()}
                                        value={tier.criteria.count}
                                        disabled={updateAchievementMutation.isPending}
                                        onChange={(ev) => handleTierCountChange(tier.id, ev.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={handleCancelTierEdit}
                            disabled={updateAchievementMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSaveTierChanges} disabled={updateAchievementMutation.isPending}>
                            Save Tier Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardShell>
    );
}
