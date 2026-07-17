import {RotateCw} from "lucide-react";
import {Popover, PopoverContent, PopoverTrigger} from "@/lib/client/components/ui/popover";

import {zeroPad} from "@/lib/utils/number-formatting";


interface DisplayTvRedoProps {
    rewatches: { seasonNumber: number; count: number }[];
}


export const DisplayTvRedo = ({ rewatches }: DisplayTvRedoProps) => {
    const totalRedo = rewatches.reduce((total, item) => total + item.count, 0);

    if (totalRedo === 0) return null;

    return (
        <Popover>
            <PopoverTrigger>
                <div className="flex items-center gap-x-1">
                    <RotateCw size={15} className="text-green-500"/>
                    <div>{totalRedo} S.</div>
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-40 px-5 pt-3 pb-3 max-h-52.5 overflow-auto" align="center">
                <div className=" grid gap-3">
                    <div className="space-y-2">
                        {rewatches.map(({ seasonNumber, count }) => (
                            <div key={seasonNumber} className="flex gap-3 items-center justify-between">
                                <div className="text-sm font-medium leading-none">
                                    Season {zeroPad(seasonNumber)}
                                </div>
                                <div className="text-sm font-medium">
                                    {count}x
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
