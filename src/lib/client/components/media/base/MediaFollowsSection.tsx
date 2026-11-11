import {Activity} from "lucide-react";
import {MediaType} from "@/lib/utils/enums";
import {MediaFollowsDetails} from "@/lib/types/query.options.types";
import {MediaFollowCard} from "@/lib/client/components/media/base/MediaFollowCard";
import {Card, CardContent, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


interface MediaFollowsSectionProps {
    mediaType: MediaType;
    isAnonymous?: boolean;
    followsData: MediaFollowsDetails;
}


export function MediaFollowsSection({ followsData, mediaType, isAnonymous }: MediaFollowsSectionProps) {
    return (
        <Card className="h-fit min-w-0 gap-0 bg-popover py-0">
            <CardHeader className="border-b p-4">
                <CardTitle className="text-sm leading-5 font-semibold">
                    <h3 className="flex items-center gap-2">
                        <Activity className="size-5 text-brand"/>
                        Follows Activity ({followsData.length})
                    </h3>
                </CardTitle>
            </CardHeader>
            <CardContent className="max-h-90 overflow-y-auto p-2 scrollbar-thin">
                {followsData.length > 0 ?
                    followsData.map((follow) =>
                        <MediaFollowCard
                            key={follow.id}
                            followData={follow}
                            mediaType={mediaType}
                        />
                    )
                    :
                    isAnonymous ?
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            Log-in or register to see your follows activity.
                        </div>
                        :
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            None of your follows track this media yet.
                        </div>
                }
            </CardContent>
        </Card>
    );
}
