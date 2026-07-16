import {queryOptions} from "@tanstack/react-query";
import {getFeatureVotes} from "@/lib/server/functions/feature-votes";
import {viewerScopedKey} from "@/lib/client/react-query/query-options/viewer-cache";


export const featureVotesOptions = () => queryOptions({
    queryKey: viewerScopedKey(["featureVotes"]),
    queryFn: () => getFeatureVotes(),
});
