import {MediaType} from "@/lib/utils/enums";
import {capitalize} from "@/lib/utils/formatting/text";
import type {ScopedMediaFilters, ScopedMediaFilterValues} from "@/lib/schemas/media-filters.schema";
import {getMediaDefinition, type MediaCommonFilterKey, type MediaFilterKeyFor} from "@/lib/media-definitions/definition.registry";
import {getMediaConfig} from "@/lib/client/components/media/media-config";


export const getMediaFilterDefinitions = <T extends MediaType>(mediaType: T) => {
    const presentation = getMediaConfig(mediaType).metadataFilters;
    const keys = Object.keys(getMediaDefinition(mediaType).filters.metadata) as MediaFilterKeyFor<T>[];

    return keys.map(key => ({ key, ...presentation[key] }));
};


export const getMediaCommonFilterKeys = (mediaTypes: readonly MediaType[]) => new Set<MediaCommonFilterKey>(
    mediaTypes.flatMap(mediaType => Object.keys(getMediaDefinition(mediaType).filters.common) as MediaCommonFilterKey[])
        .filter(key => mediaTypes.every(mediaType => key in getMediaDefinition(mediaType).filters.common)),
);


export const getMediaFilterGroups = (filters: ScopedMediaFilters = {}) => Object.entries(filters).flatMap(([type, metadata]: [string, ScopedMediaFilterValues]) => {
    const mediaType = type as MediaType;
    const typeLabel = mediaType === MediaType.SERIES ? "TV series" : capitalize(mediaType);

    return [
        ...getMediaFilterDefinitions(mediaType),
        { key: "genres" as const, title: "Genres", render: undefined },
        { key: "tags" as const, title: "Tags", render: undefined },
        { key: "excludeTags" as const, title: "Exclude tags", render: undefined },
    ].flatMap(filter => {
        const values = metadata[filter.key];
        if (!values?.length) return [];

        return [{
            mediaType,
            field: filter.key,
            matchAll: filter.key === "tags" && metadata.tagsMatch === "all",
            label: `${typeLabel} · ${filter.title}`,
            items: values.map(value => ({
                value,
                label: filter.render ? filter.render(value) : value,
            })),
        }];
    });
});
