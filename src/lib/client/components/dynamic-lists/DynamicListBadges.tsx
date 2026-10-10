import type {MediaType} from "@/lib/utils/enums";
import type {DynamicListSpec} from "@/lib/schemas/dynamic-lists.schema";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {OverflowBadges} from "@/lib/client/components/general/OverflowBadges";
import {dynamicListBadgeLabels} from "@/lib/client/components/dynamic-lists/dynamic-list.utils";


interface DynamicListBadgesProps {
    className?: string;
    sortLabel?: string;
    spec: DynamicListSpec;
    activeMediaTypes: readonly MediaType[];
}


export const DynamicListBadges = ({ spec, activeMediaTypes, className, sortLabel }: DynamicListBadgesProps) => {
    const badges = dynamicListBadgeLabels(spec, sortLabel).map((label, index) => {
        const mediaTypes = spec.mediaTypes === "all"
            ? index === 0 ? activeMediaTypes : []
            : index < spec.mediaTypes.length ? [spec.mediaTypes[index]] : [];

        return {
            key: label,
            content: <>
                {mediaTypes.map(mediaType => <MainThemeIcon key={mediaType} type={mediaType}/>)}
                <span>{label}</span>
            </>,
        };
    });

    return <OverflowBadges badges={badges} label="List rules" itemLabel="list rule" overflowTitle="More list rules" className={className}/>;
};
