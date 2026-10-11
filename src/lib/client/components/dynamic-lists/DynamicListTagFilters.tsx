import type {DynamicListTagRule} from "@/lib/schemas/dynamic-lists.schema";
import type {IdNamePair} from "@/lib/types/media-common.types";
import {MediaTagFilters} from "@/lib/client/components/media/browse/MediaTagFilters";


interface DynamicListTagFiltersProps {
    rules?: DynamicListTagRule[];
    disabled: boolean;
    options: IdNamePair[];
    errors: Record<string, string>;
    tagNames: Record<number, string>;
    onChange: (rules: DynamicListTagRule[]) => void;
}


export const DynamicListTagFilters = ({ rules = [{}], options, tagNames, disabled, errors, onChange }: DynamicListTagFiltersProps) => {
    const idsByName = new Map(options.map(tag => [tag.name, tag.id]));

    return rules.map((rule, index) => (
        <MediaTagFilters
            key={index}
            options={options.map(tag => tag.name)}
            disabled={disabled}
            filters={{
                tags: rule.tags?.map(id => tagNames[id]),
                tagsMatch: rule.tagsMatch,
                excludeTags: rule.excludeTags?.map(id => tagNames[id]),
            }}
            errors={{ tags: errors[`tagRules.${index}.tags`], excludeTags: errors[`tagRules.${index}.excludeTags`] }}
            onChange={next => onChange(rules.map((current, ruleIndex) => ruleIndex !== index ? current : {
                ...current,
                ...("tags" in next && { tags: next.tags?.map(name => idsByName.get(name)!) }),
                ...("excludeTags" in next && { excludeTags: next.excludeTags?.map(name => idsByName.get(name)!) }),
                ...("tagsMatch" in next && { tagsMatch: next.tagsMatch }),
            }))}
        />
    ));
};
