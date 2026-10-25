import { useLocalSearchParams } from "expo-router";
import { Page, StateView } from "../../components/ui";
import { AchievementsContent } from "./AchievementsScreen";
import { ActivityContent } from "./ActivityScreen";
import { StatsContent } from "./StatsScreen";
import { CalendarContent } from "./CalendarContent";

export function ProfileSectionScreen({ section }: { section: "activity" | "stats" | "achievements" | "releases" }) {
    const params = useLocalSearchParams<{ userId?: string; username?: string }>();
    const userId = params.userId ? Number(params.userId) : undefined;
    const title = { activity: "Activity", stats: "Statistics", achievements: "Achievements", releases: "Releases" }[
        section
    ];
    return (
        <Page title={title} subtitle={userId ? params.username : undefined} brand back>
            {section === "activity" && <ActivityContent userId={userId} />}
            {section === "stats" && <StatsContent userId={userId} />}
            {section === "achievements" && <AchievementsContent userId={userId} />}
            {section === "releases" && (userId
                ? <StateView title="Your calendar is private" message="Release calendars are only available to their owner." />
                : <CalendarContent />)}
        </Page>
    );
}
