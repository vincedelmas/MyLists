import {ReactNode} from "react";
import {MediaType} from "@/lib/utils/enums";
import {capitalize} from "@/lib/utils/text-formatting";
import {TabItem} from "@/lib/client/components/general/TabHeader";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";


type MediaAgg = "all" | "overview";


interface MediaItemOptions<TLeading extends MediaAgg> {
    leading: TLeading;
    leadingLabel?: ReactNode;
}


export const createMediaTabItems = <T extends MediaType, L extends MediaAgg>(mediaTypes: readonly T[], options: MediaItemOptions<L>): TabItem<T | L>[] => {
    const { leading, leadingLabel } = options;

    return [
        {
            id: leading,
            isAccent: true,
            label: leadingLabel,
            icon: <MainThemeIcon type={leading}/>,
        },
        ...mediaTypes.map((mediaType) => ({
            id: mediaType,
            label: capitalize(mediaType),
            icon: <MainThemeIcon type={mediaType}/>,
        })),
    ];
};


export const createMediaSelectItems = (mediaTypes: readonly MediaType[], opts: { leading?: MediaAgg, leadingLabel?: ReactNode } = {}) => {
    const { leading, leadingLabel } = opts;

    const mediaItems = mediaTypes.map((mediaType) => ({
        value: mediaType,
        label: (
            <span className="flex items-center gap-2 capitalize">
                <MainThemeIcon type={mediaType}/>
                <span>{mediaType}</span>
            </span>
        ),
    }));

    if (!leading) {
        return mediaItems;
    }

    return [
        {
            value: leading,
            label: (
                <span className="flex items-center gap-2 capitalize">
                    <MainThemeIcon type={leading}/>
                    <span>{leadingLabel}</span>
                </span>
            )
        },
        ...mediaItems,
    ];
};
