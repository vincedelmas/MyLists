import type {MediaType} from "@/lib/utils/enums";
import {Badge} from "@/lib/client/components/ui/badge";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";


interface CollectionMediaTypesProps {
    mediaTypes: readonly MediaType[];
}


export const CollectionMediaTypes = ({ mediaTypes }: CollectionMediaTypesProps) => {
    return mediaTypes.map(mediaType =>
        <Badge key={mediaType} variant="outline" className="capitalize">
            <MainThemeIcon type={mediaType}/>
            {mediaType}
        </Badge>
    );
};
