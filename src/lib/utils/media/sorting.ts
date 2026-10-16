import type {MediaType} from "@/lib/utils/enums";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import type {MediaDefinition} from "@/lib/media-definitions/base/media.definition";
import {MEDIA_SORT_DEFINITIONS, type MediaSortKey} from "@/lib/media-definitions/base/media-sorting";


export const getMediaSortLabel = (definition: Pick<MediaDefinition, "sorting">, key: MediaSortKey) => {
    return definition.sorting.labels?.[key] ?? MEDIA_SORT_DEFINITIONS[key].label;
};


export const getMediaSortOptions = (mediaTypes: readonly MediaType[], personal: boolean) => {
    const definitions = mediaTypes.map(getMediaDefinition);
    if (definitions.length === 0) return [];

    return definitions[0].sorting.options
        .filter(key => (personal || !MEDIA_SORT_DEFINITIONS[key].personal)
            && definitions.every(def => def.sorting.options.includes(key))
            && (MEDIA_SORT_DEFINITIONS[key].field !== "providerRating"
                || definitions.every(def => def.externalSearch?.provider === definitions[0].externalSearch?.provider)))
        .map(key => {
            const labels = definitions.map(def => getMediaSortLabel(def, key));
            return {
                value: key,
                label: labels.every(label => label === labels[0]) ? labels[0] : MEDIA_SORT_DEFINITIONS[key].label,
            };
        });
};
