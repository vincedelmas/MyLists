import type {MediaType} from "@/lib/utils/enums";
import type {MediaListData} from "@/lib/types/media-list.types";
import type {SelectResultFields} from "drizzle-orm/query-builders/select.types";
import type {ServerMediaDefinitionFor} from "@/lib/media-definitions/definition.registry.server";


export type MediaListRowByType = {
    [T in MediaType]: SelectResultFields<ServerMediaDefinitionFor<T>["repository"]["listQuery"]["selection"]>;
};


export type MediaListDataByType = {
    [K in MediaType]: MediaListData<MediaListRowByType[K]>;
};
