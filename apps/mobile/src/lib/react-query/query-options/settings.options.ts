import {api} from "../../api-client";
import {queryOptions} from "@tanstack/react-query";


export const settingsOptions = queryOptions({
    queryKey: ["settings"],
    queryFn: ({ signal }) => api.settings(signal),
});
