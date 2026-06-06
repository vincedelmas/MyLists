import {Activity} from "lucide-react";
import {MediaType} from "@/lib/utils/enums";
import {Card} from "@/lib/client/components/ui/card";
import {MediaFollowsDetails} from "@/lib/types/query.options.types";
import {MediaFollowCard} from "@/lib/client/components/media/base/MediaFollowCard";


interface MediaFollowsSectionProps {
    mediaType: MediaType;
    isAnonymous?: boolean;
    followsData: MediaFollowsDetails;
}


export function MediaFollowsSection({ followsData, mediaType, isAnonymous }: MediaFollowsSectionProps) {
    return (
        <Card className="bg-popover p-0 h-fit min-w-0">
            <div className="p-4 border-b">
                <h3 className="flex items-center gap-2 text-primary font-semibold">
                    <Activity className="size-5 text-app-accent"/>
                    Follows Activity ({followsData.length})
                </h3>
            </div>
            <div className="overflow-y-auto scrollbar-thin max-h-90 space-y-1 p-2 mb-3">
                {followsData.length > 0 ?
                    followsData.map((follow) =>
                        <MediaFollowCard
                            key={follow.name}
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
            </div>
        </Card>
    );
}
