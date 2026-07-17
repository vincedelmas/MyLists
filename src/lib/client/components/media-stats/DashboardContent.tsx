import {UserStatsResult} from "@/lib/types/stats.types";
import {OverviewDashboard} from "@/lib/client/components/media-stats/OverviewDashboard";
import {MediaTypeDashboard} from "@/lib/client/components/media-stats/MediaTypeDashboard";


interface DashboardContentProps {
    data: UserStatsResult;
}


export const DashboardContent = ({ data }: DashboardContentProps) => {
    if (data.mediaType === undefined) {
        return <OverviewDashboard stats={data}/>;
    }

    return <MediaTypeDashboard stats={data}/>;
};
