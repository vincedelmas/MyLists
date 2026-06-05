import {RotateCw} from "lucide-react";
import {Popover, PopoverContent, PopoverTrigger} from "@/lib/client/components/ui/popover";

import {zeroPad} from "@/lib/utils/number-formatting";


interface DisplayTvRedoProps {
    redoValues: number[];
}


export const DisplayTvRedo = ({ redoValues }: DisplayTvRedoProps) => {
    const maxCount = Math.max(...redoValues);
    const totalRedo = redoValues.reduce((a, b) => a + b, 0);

    if (maxCount === 0) return null;

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
                        {redoValues.map((season, idx) => (
                            <div key={idx} className="flex gap-3 items-center justify-between">
                                <div className="text-sm font-medium leading-none">
                                    Season {zeroPad(idx + 1)}
                                </div>
                                <div className="text-sm font-medium">
                                    {season}x
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
