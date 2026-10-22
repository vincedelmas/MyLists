import {Redirect} from "expo-router";

export default function AchievementsRoute() {
    return <Redirect href={{pathname: "/(tabs)/(profile)", params: {tab: "achievements"}}}/>;
}
