import {Spinner} from "@/lib/client/components/ui/spinner";


export const NavLoader = () => {
    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-360px)]">
            <Spinner className="size-12"/>
        </div>
    );
};
