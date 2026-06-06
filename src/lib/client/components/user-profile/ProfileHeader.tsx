import {Link} from "@tanstack/react-router";
import {CalendarDays, Users} from "lucide-react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {formatDate} from "@/lib/utils/date-formatting";
import {capitalize} from "@/lib/utils/text-formatting";
import {formatLevel} from "@/lib/utils/number-formatting";
import {useBreakpoint} from "@/lib/client/hooks/use-breakpoint";
import {PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {FollowButton} from "@/lib/client/components/user-profile/FollowButton";
import {ProfileHeaderOptionsType, UserDataType} from "@/lib/types/query.options.types";


interface ProfileHeaderProps {
    profileUser: UserDataType;
    social: ProfileHeaderOptionsType["social"];
}


export const ProfileHeader = ({ profileUser, social }: ProfileHeaderProps) => {
    const { currentUser } = useAuth();
    const isConnected = (!!currentUser);
    const isBelowSm = useBreakpoint("sm");
    const isCurrent = (currentUser?.id === profileUser.id);
    const profileLevel = Math.floor(formatLevel(profileUser.userMediaSettings
        .reduce((acc, cur) => cur.active ? acc + cur.timeSpent : acc, 0)
    ));

    return (
        <div className="relative mb-20 w-screen left-1/2 right-1/2 ml-[-50vw] mr-[-50vw] max-sm:mb-2">
            <div className="h-64 w-full bg-neutral-800 overflow-hidden relative max-sm:h-42">
                <div className="absolute inset-0 bg-linear-to-t from-neutral-950 to-transparent opacity-20 z-10"/>
                <img
                    alt="Cover"
                    src={profileUser.backgroundImage}
                    className="w-full h-full object-cover opacity-80"
                />
            </div>

            {isBelowSm ?
                <div className="relative z-20 flex flex-col justify-center items-center gap-3 -mt-15">
                    <div className="relative">
                        <ProfileIcon
                            fallbackSize="text-4xl"
                            className="w-full h-full size-26"
                            user={{ name: profileUser.name, image: profileUser.image }}
                        />
                        <div className="absolute -bottom-2 left-12 w-18 h-7 z-20 flex items-center justify-center
                    rounded-full font-bold text-xs bg-app-accent/70 border-4 border-background shadow-lg">
                            Lvl. {profileLevel}
                        </div>
                    </div>
                    <div className="flex flex-col mb-1 px-4">
                        <div className="flex items-baseline gap-3">
                            <Link to="/profile/$username" params={{ username: profileUser.name }}>
                                <h1 className="text-3xl font-bold mb-1 max-sm:text-2xl max-sm:wrap-break-word">
                                    {profileUser.name}
                                </h1>
                            </Link>
                            <p title={`${capitalize(profileUser.privacy)} account`}>
                                <PrivacyIcon type={profileUser.privacy} className="size-3.5"/>
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-start text-sm gap-x-4 gap-y-1 text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <CalendarDays className="size-4"/>{" "}
                                Joined {formatDate(profileUser.createdAt)}
                            </span>
                            <Link to="/profile/$username/follows" params={{ username: profileUser.name }}>
                                <span className="flex items-center gap-1">
                                    <Users className="size-4"/>{" "}
                                    {social.followsCount} Follows
                                </span>
                            </Link>
                            <Link to="/profile/$username/followers" params={{ username: profileUser.name }}>
                                <span className="flex items-center gap-1">
                                    <Users className="size-4"/>{" "}
                                    {social.followersCount} Followers
                                </span>
                            </Link>
                        </div>
                    </div>
                    {(!isCurrent && isConnected) &&
                        <FollowButton
                            social={social}
                            profileUsername={profileUser.name}
                        />
                    }
                </div>
                :
                <div className="absolute -bottom-16 left-0 right-0 z-20 max-sm:px-8">
                    <div className="max-w-7xl mx-auto flex flex-row items-end gap-6 pl-8 max-sm:flex-col">
                        <div className="relative group">
                            <ProfileIcon
                                fallbackSize="text-4xl"
                                className="w-full h-full size-32"
                                user={{ name: profileUser.name, image: profileUser.image }}
                            />
                            <div className="absolute -bottom-2 -right-2 w-18 h-7 z-20 flex items-center justify-center
                            rounded-full font-bold text-xs bg-app-accent text-black border-4 border-background shadow-lg">
                                Lvl. {profileLevel}
                            </div>
                        </div>

                        <div className="flex-1 mb-1">
                            <div className="flex items-baseline gap-3">
                                <Link to="/profile/$username" params={{ username: profileUser.name }}>
                                    <h1 className="text-3xl font-bold mb-1">
                                        {profileUser.name}
                                    </h1>
                                </Link>
                                <p title={`${capitalize(profileUser.privacy)} account`}>
                                    <PrivacyIcon type={profileUser.privacy} className="size-4"/>
                                </p>
                            </div>
                            <div className="text-sm flex flex-wrap items-center justify-start gap-4 text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <CalendarDays className="size-4"/>{" "}
                                    Joined {formatDate(profileUser.createdAt)}
                                </span>
                                <Link to="/profile/$username/follows" params={{ username: profileUser.name }}>
                                    <span className="flex items-center gap-1">
                                        <Users className="size-4"/>{" "}
                                        {social.followsCount} Follows
                                    </span>
                                </Link>
                                <Link to="/profile/$username/followers" params={{ username: profileUser.name }}>
                                    <span className="flex items-center gap-1">
                                        <Users className="size-4"/>{" "}
                                        {social.followersCount} Followers
                                    </span>
                                </Link>
                            </div>
                        </div>
                        <div className="mb-5 px-8">
                            {(!isCurrent && isConnected) &&
                                <FollowButton
                                    social={social}
                                    profileUsername={profileUser.name}
                                />
                            }
                        </div>
                    </div>
                </div>
            }
        </div>
    );
};
