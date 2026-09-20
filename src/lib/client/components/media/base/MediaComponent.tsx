import {MediaType} from "@/lib/utils/enums";
import {mediaConfig} from "@/lib/client/components/media/media-config";
import {ExtractMediaDetailsByType} from "@/lib/types/query.options.types";
import type {MediaDetailsPresentationProps} from "../media-config.types";


interface MediaComponentProps<T extends MediaType> {
    mediaType: T;
    media: ExtractMediaDetailsByType<T>;
    name: "overTitle" | "underTitle" | "infoGrid" | "upComingAlert" | "extraSections" | "coverAction";
}


export const MediaComponent = <T extends MediaType>({ mediaType, media, name }: MediaComponentProps<T>) => {
    const MediaComponent = mediaConfig[mediaType][name];

    return (
        <>
            {MediaComponent &&
                <MediaComponent
                    media={media}
                    mediaType={mediaType}
                />
            }
        </>
    );
};

export const MediaDetailsPresentation = <T extends MediaType>(props: MediaDetailsPresentationProps<T>) => {
    const Presentation = mediaConfig[props.mediaType].detailsPresentation;
    return Presentation ? <Presentation {...props}/> : props.children({media: props.media});
};
