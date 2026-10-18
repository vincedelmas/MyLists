import {PrivacyType, RoleType} from "@/lib/utils/enums";
import {capitalize} from "@/lib/utils/formatting/text";
import type {AdminUpdatePayload} from "@/lib/schemas";
import {Button} from "@/lib/client/components/ui/button";
import {MoreHorizontal, Trash2, UserCheck, UserPen, UserX} from "lucide-react";
import {PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import type {AdminUser} from "@/lib/client/react-query/query-options/admin.options";
import {
    DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/lib/client/components/ui/dropdown-menu";


interface UserActionsMenuProps {
    user: AdminUser;
    disabled: boolean;
    onImpersonate: () => void;
    onUpdate: (payload: AdminUpdatePayload) => void;
}


export function UserActionsMenu({ user, disabled, onImpersonate, onUpdate }: UserActionsMenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="hover" size="icon" disabled={disabled} aria-label={`Manage ${user.name}`}/>}>
                <MoreHorizontal/>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuGroup>
                    <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
                    <DropdownMenuItem disabled={disabled} onClick={onImpersonate}>
                        <UserPen/>Sign in as user
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={disabled} onClick={() => onUpdate({ emailVerified: !user.emailVerified })}>
                        {user.emailVerified ? <UserX/> : <UserCheck/>}
                        {user.emailVerified ? "Mark email as unverified" : "Verify email"}
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator/>
                <DropdownMenuGroup>
                    <DropdownMenuLabel>Pending prompts</DropdownMenuLabel>
                    <DropdownMenuCheckboxItem disabled={disabled} checked={user.showUpdateModal}
                                              onCheckedChange={checked => onUpdate({ showUpdateModal: checked })}>
                        News notice
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem disabled={disabled} checked={user.showOnboarding}
                                              onCheckedChange={checked => onUpdate({ showOnboarding: checked })}>
                        Onboarding
                    </DropdownMenuCheckboxItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator/>
                <DropdownMenuGroup>
                    <DropdownMenuLabel>Profile privacy</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={user.privacy} onValueChange={privacy => onUpdate({ privacy: privacy as PrivacyType })}>
                        {Object.values(PrivacyType).map(privacy => <DropdownMenuRadioItem key={privacy} value={privacy} disabled={disabled}>
                            <PrivacyIcon type={privacy}/>{capitalize(privacy)}
                        </DropdownMenuRadioItem>)}
                    </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
                <DropdownMenuSeparator/>
                <DropdownMenuGroup>
                    <DropdownMenuLabel>Account role</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={user.role} onValueChange={role => onUpdate({ role: role as RoleType })}>
                        {Object.values(RoleType).map(role => <DropdownMenuRadioItem key={role} value={role} disabled={disabled}>
                            {capitalize(role)}
                        </DropdownMenuRadioItem>)}
                    </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
                <DropdownMenuSeparator/>
                <DropdownMenuGroup>
                    <DropdownMenuItem disabled={disabled} variant="destructive" onClick={() => onUpdate({ deleteUser: true })}>
                        <Trash2/>Delete user
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
