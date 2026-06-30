import {queryOptions} from "@tanstack/react-query";
import {getWhichCameFirstGame} from "@/lib/server/functions/which-came-first";


export const whichCameFirstOptions = queryOptions({
    queryKey: ["which-came-first"],
    queryFn: () => getWhichCameFirstGame(),
});
