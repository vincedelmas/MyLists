import {MediaType} from "@/lib/utils/enums";
import {UserStatsResult} from "@/lib/types/stats.types";
import {OverviewDashboard} from "@/lib/client/components/media-stats/OverviewDashboard";
import {MediaTypeDashboard} from "@/lib/client/components/media-stats/MediaTypeDashboard";


interface DashboardContentProps {
    subjectName?: string;
    data: UserStatsResult;
    onSelectMediaType?: (mediaType: MediaType) => void;
}


export const DashboardContent = ({ data, subjectName, onSelectMediaType }: DashboardContentProps) => {
    if (data.kind === "overview") {
        return (
            <OverviewDashboard
                stats={data}
                subjectName={subjectName}
                onSelectMediaType={onSelectMediaType}
            />
        );
    }

    return (
        <MediaTypeDashboard
            stats={data}
        />
    );
};
