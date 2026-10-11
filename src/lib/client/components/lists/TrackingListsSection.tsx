import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {capitalize} from "@/lib/utils/formatting/text";
import {formatNumber} from "@/lib/utils/formatting/number";
import {ArrowUpRight, LibraryBig, Play} from "lucide-react";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {Card, CardAction, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


interface TrackingListsSectionProps {
    username: string;
    mediaType?: MediaType;
    showContinue: boolean;
    presets: { mediaType: MediaType; totalEntries: number }[];
}


export const TrackingListsSection = ({ username, mediaType, presets, showContinue }: TrackingListsSectionProps) => (
    <section aria-labelledby="tracking-lists-title" className="flex flex-col gap-4">
        <h2 id="tracking-lists-title" className="flex items-center gap-2 text-lg font-semibold">
            <LibraryBig className="size-5 text-brand"/> Tracking lists
        </h2>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            {presets.map(preset =>
                <Card key={preset.mediaType} size="sm" className="relative transition-shadow hover:ring-brand hover:shadow-sm">
                    <Link
                        to="/lists/tracking/$mediaType/$username"
                        params={{ username, mediaType: preset.mediaType }}
                        aria-label={`${capitalize(preset.mediaType)} list`}
                        className="absolute inset-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <CardHeader className="pointer-events-none">
                        <CardTitle className="flex items-center gap-2">
                            <MainThemeIcon type={preset.mediaType}/>
                            {capitalize(preset.mediaType)}
                        </CardTitle>
                        <CardDescription>
                            {formatNumber(preset.totalEntries)} media
                        </CardDescription>
                        <CardAction>
                            <ArrowUpRight className="size-4 text-muted-foreground"/>
                        </CardAction>
                    </CardHeader>
                </Card>
            )}

            {showContinue &&
                <Card size="sm" className="relative transition-shadow hover:ring-brand hover:shadow-sm">
                    <Link
                        aria-label="Continue list"
                        to="/lists/continue/$username" params={{ username }}
                        search={{ activeTab: mediaType === MediaType.MOVIES ? undefined : mediaType }}
                        className="absolute inset-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <CardHeader className="pointer-events-none">
                        <CardTitle className="flex items-center gap-2">
                            <Play className="size-4 text-brand"/>Continue
                        </CardTitle>
                        <CardDescription>
                            Media on going
                        </CardDescription>
                        <CardAction>
                            <ArrowUpRight className="size-4 text-muted-foreground"/>
                        </CardAction>
                    </CardHeader>
                </Card>
            }
        </div>
    </section>
);
