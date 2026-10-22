import type {Href} from "expo-router";

// Derive tab names from Expo's generated routes rather than maintaining a second route list.
type TabRoute = Extract<Extract<Href, {pathname: string}>["pathname"], `/(tabs)/(${string})`>;
type TabName = TabRoute extends `/(tabs)/${infer Name}` ? Name : never;
export type TabParamList = {[Name in TabName]: undefined};
