import {Pin} from "lucide-react";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {DropdownMenuItem} from "@/lib/client/components/ui/dropdown-menu";
import {useIsMutating, useQuery} from "@tanstack/react-query";
import {MAX_PROFILE_PINS, type ProfilePinItem} from "@/lib/schemas/profile-pins.schema";
import {ownProfilePinsOptions} from "@/lib/client/react-query/query-options/profile-pins.options";
import {useSetProfilePinMutation} from "@/lib/client/react-query/query-mutations/profile-pins.mutations";


interface ProfilePinMenuItemProps {
    item: ProfilePinItem & { title: string };
}


export const ProfilePinMenuItem = ({ item }: ProfilePinMenuItemProps) => {
    const confirm = useConfirm();
    const pins = useQuery(ownProfilePinsOptions);
    const mutation = useSetProfilePinMutation();
    const pending = useIsMutating({ mutationKey: ["profile-pins"] }) > 0;
    const pinned = pins.data?.some(pin => pin.kind === item.kind && pin.id === item.id) ?? false;
    const full = !pinned && (pins.data?.length ?? 0) >= MAX_PROFILE_PINS;
    const label = pinned ? "Unpin from profile" : "Pin to profile";

    const handleToggle = async () => {
        if (pinned && !await confirm({
            title: `Unpin this ${item.kind === "dynamic" ? "list" : "collection"}?`,
            confirmLabel: "Unpin",
            description: `“${item.title}” will be removed from your profile overview. You can still open it from Lists & collections.`,
        })) return;

        mutation.mutate({ kind: item.kind, id: item.id, pinned: !pinned });
    };

    return (
        <DropdownMenuItem
            onClick={handleToggle}
            disabled={!pins.data || pins.isFetching || pending || full}
            title={full ? `All ${MAX_PROFILE_PINS} profile pins are used. Unpin a list or collection to make room.` : label}
        >
            {mutation.isPending ?
                <Spinner/>
                :
                <Pin className={pinned ? "fill-current" : undefined}/>
            }
            <span>{label}</span>
        </DropdownMenuItem>
    );
};
