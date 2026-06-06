import {cn} from "@/lib/utils/classnames";
import {Avatar, AvatarFallback, AvatarImage} from "@/lib/client/components/ui/avatar";


interface ProfileIconProps {
    className?: string;
    fallbackSize?: string;
    user: {
        name: string,
        image: string | null,
    };
}


export const ProfileIcon = ({ user, className, fallbackSize }: ProfileIconProps) => {
    return (
        <Avatar className={cn("rounded-full object-cover border-4 border-background bg-accent overflow-hidden shadow-2xl", className)}>
            <AvatarImage
                alt={user.name}
                src={user.image ?? ""}
            />
            <AvatarFallback className={cn("text-3xl font-medium tracking-wide bg-accent", fallbackSize)}>
                {user.name.charAt(0).toUpperCase() + user.name.charAt(1).toUpperCase()}
            </AvatarFallback>
        </Avatar>
    );
};
