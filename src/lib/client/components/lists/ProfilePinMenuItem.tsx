import {Pin} from "lucide-react";
import {useIsMutating, useQuery} from "@tanstack/react-query";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {useDelayedLoading} from "@/lib/client/hooks/use-delayed-loading";
import {DropdownMenuItem} from "@/lib/client/components/ui/dropdown-menu";
import {MAX_PROFILE_PINS, type ProfilePinItem} from "@/lib/schemas/profile-pins.schema";
import {useSetProfilePinMutation} from "@/lib/client/react-query/query-mutations/profile-pins.mutations";
import {ownProfilePinsOptions} from "@/lib/client/react-query/query-options/profile-pins.options";


interface ProfilePinMenuItemProps {
    item: ProfilePinItem & { title: string };
}


export const ProfilePinMenuItem = ({ item }: ProfilePinMenuItemProps) => {
    const mutation = useSetProfilePinMutation();
    const pins = useQuery(ownProfilePinsOptions);
    const loading = useDelayedLoading(pins.isFetching || mutation.isPending);
    const pending = useIsMutating({ mutationKey: ["profile-pins"] }) > 0;
    const pinned = pins.data?.some(pin => pin.kind === item.kind && pin.id === item.id) ?? false;

    const label = pinned ? "Unpin from profile" : "Pin to profile";
    const full = !pinned && (pins.data?.length ?? 0) >= MAX_PROFILE_PINS;

    return (
        <DropdownMenuItem
            closeOnClick={false}
            aria-busy={pins.isFetching || mutation.isPending || loading}
            disabled={!pins.data || pins.isFetching || pending || loading || full}
            onClick={() => mutation.mutate({ kind: item.kind, id: item.id, pinned: !pinned })}
            title={full
                ? `All ${MAX_PROFILE_PINS} profile pins are used. Unpin a list or collection to make room.`
                : label
            }
        >
            {loading
                ? <Spinner aria-label="Loading profile pins"/>
                : <Pin className={pinned ? "fill-current" : undefined}/>
            }
            <span>{label}</span>
        </DropdownMenuItem>
    );
};
