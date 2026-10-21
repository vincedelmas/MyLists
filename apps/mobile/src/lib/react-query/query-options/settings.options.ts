import {queryOptions} from "@tanstack/react-query";
import {api} from "../../api-client";

export const settingsOptions = queryOptions({queryKey: ["settings"], queryFn: ({signal}) => api.settings(signal)});
