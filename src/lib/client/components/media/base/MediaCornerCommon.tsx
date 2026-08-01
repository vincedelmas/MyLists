import {CircleCheck} from "lucide-react";


export const MediaCornerCommon = ({ isCommon }: { isCommon?: boolean }) => {
    return (
        <>
            <div className="absolute top-0 right-0 border-solid border-t-0 border-r-50 border-b-50 border-l-0
            border-[transparent_#030712] opacity-70 rounded-tr-md"/>
            {isCommon &&
                // <Button variant="overlay" size="icon-sm" className="absolute top-1 right-1">
                //     <CircleCheck className="size-4 text-brand"/>
                // </Button>
                <div className="absolute top-1.5 right-1.5">
                    <CircleCheck className="size-4 text-brand"/>
                </div>
            }
        </>
    );
};
