import {queryOptions} from "@tanstack/react-query";
import {getWhichCameFirstGame} from "@/lib/server/functions/which-came-first";
import {viewerScopedKey} from "@/lib/client/react-query/query-options/viewer-cache";


export const whichCameFirstOptions = () => queryOptions({
    queryKey: viewerScopedKey(["which-came-first"]),
    queryFn: () => getWhichCameFirstGame(),
});
