import {Pin} from "lucide-react";
import {Button} from "@/lib/client/components/ui/button";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {useIsMutating, useQuery} from "@tanstack/react-query";
import {MAX_PROFILE_SMART_VIEWS} from "@/lib/schemas/smart-view-profile.schema";
import {smartViewsOptions, type SmartViewRecord} from "@/lib/client/react-query/query-options/smart-views.options";
import {useSetProfileSmartViewsMutation} from "@/lib/client/react-query/query-mutations/smart-views.mutations";


export const SmartListPinButton = ({ view, compact = false }: { view: SmartViewRecord; compact?: boolean }) => {
    const confirm = useConfirm();
    const views = useQuery(smartViewsOptions);
    const mutation = useSetProfileSmartViewsMutation();
    const pending = useIsMutating({ mutationKey: ["smart-views", "pins"] }) > 0;

    const pinned = view.profilePosition !== null;
    const pinnedIds = views.data?.filter(item => item.profilePosition !== null)
        .sort((a, b) => a.profilePosition! - b.profilePosition!).map(item => item.id) ?? [];

    const label = pinned ? "Unpin from profile" : "Pin to profile";
    const full = !pinned && pinnedIds.length >= MAX_PROFILE_SMART_VIEWS;

    const handleToggle = async () => {
        if (pinned && !await confirm({
            title: "Unpin this list?",
            confirmLabel: "Unpin list",
            description: `“${view.spec.title}” will be removed from your profile overview. You can still open it from Smart lists.`,
        })) return;

        mutation.mutate(pinned ? pinnedIds.filter(id => id !== view.id) : [...pinnedIds, view.id]);
    };

    return (
        <Button
            type="button"
            aria-label={label}
            aria-pressed={pinned}
            onClick={handleToggle}
            size={compact ? "icon-sm" : "icon"}
            variant={pinned ? "secondary" : "outline"}
            disabled={!views.data || views.isFetching || pending || full}
            title={full ? `All ${MAX_PROFILE_SMART_VIEWS} profile pins are used. Unpin a list to make room.` : label}
        >
            {mutation.isPending ?
                <Spinner data-icon="inline-start"/>
                :
                <Pin
                    data-icon="inline-start"
                    className={pinned ? "fill-current" : undefined}
                />
            }
        </Button>
    );
};
