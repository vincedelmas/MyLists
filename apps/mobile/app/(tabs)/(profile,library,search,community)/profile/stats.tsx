import {Redirect} from "expo-router";

export default function StatsRoute() {
    return <Redirect href={{pathname: "/(tabs)/(profile)", params: {tab: "stats"}}}/>;
}
