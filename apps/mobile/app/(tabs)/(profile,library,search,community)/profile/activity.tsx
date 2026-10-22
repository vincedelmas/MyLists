import {Redirect} from "expo-router";

export default function ActivityRoute() {
    return <Redirect href={{pathname: "/(tabs)/(profile)", params: {tab: "activity"}}}/>;
}
