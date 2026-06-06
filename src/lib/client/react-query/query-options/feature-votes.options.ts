import {queryOptions} from "@tanstack/react-query";
import {getFeatureVotes} from "@/lib/server/functions/feature-votes";


export const featureVotesOptions = queryOptions({
    queryKey: ["featureVotes"],
    queryFn: () => getFeatureVotes(),
});
