import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {getThemeColor} from "@/lib/utils/theme-utils";
import {Progress} from "@/lib/client/components/ui/progress";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {Card, CardContent, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {formatLevel, formatPercent} from "@/lib/utils/number-formatting";


interface MediaLevelsProps {
    username: string
    settings: {
        active: boolean;
        timeSpent: number;
        mediaType: MediaType;
    }[];
}


export const MediaLevels = ({ username, settings }: MediaLevelsProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    Level Breakdown
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {settings.filter((s) => s.active).map((data) =>
                        <MediaLevelBar
                            username={username}
                            key={data.mediaType}
                            mediaType={data.mediaType}
                            level={formatLevel(data.timeSpent)}
                        />
                    )}
                </div>
            </CardContent>
        </Card>
    );
};


interface MediaLevelBarProps {
    level: number;
    username: string;
    mediaType: MediaType;
}


const MediaLevelBar = ({ mediaType, username, level }: MediaLevelBarProps) => {
    const intLevel = Math.floor(level);
    const percent = (level - intLevel) * 100;

    return (
        <div>
            <div className="flex justify-between items-end mb-1">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <MainThemeIcon
                        size={16}
                        type={mediaType}
                    />
                    <Link to="/list/$mediaType/$username" params={{ mediaType, username }}>
                            <span className="capitalize">
                                {mediaType}
                            </span>
                    </Link>
                </div>
                <span className="inline-block font-semibold text-sm tracking-wide" style={{ color: getThemeColor(mediaType) }}>
                    <div className="inline-block text-[11px] text-muted-foreground text-right">
                        ({formatPercent(percent, { fractionDigits: 0 })})
                    </div>
                    &nbsp; Lvl {intLevel}
                </span>
            </div>
            <Progress
                value={percent}
                className={"h-2"}
                color={getThemeColor(mediaType)}
            />
        </div>
    );
};
