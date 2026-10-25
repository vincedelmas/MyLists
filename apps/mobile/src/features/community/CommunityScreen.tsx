import {useTabPush} from "../../hooks/use-tab-push";
import {useState} from "react";
import {colors} from "../../theme";
import {backendUrl} from "../../lib/config";
import {openBrowserAsync} from "expo-web-browser";
import {Alert, Pressable, View} from "react-native";
import {AppText, Content, Page, Section} from "../../components/ui";
import {ChartNoAxesCombined, Clapperboard, ExternalLink, HeartHandshake, History, LibraryBig, Coffee, TrendingUp, Trophy} from "lucide-react-native";


const nativePages = new Set(["/moviedle", "/hall-of-fame", "/trends"]);

const sections = [
    {
        title: "Discover",
        items: [
            {
                title: "Trends",
                path: "/trends",
                Icon: TrendingUp,
                description: "What’s popular in movies, series and games",
            },
            {
                path: "/platform-stats",
                title: "Platform stats",
                Icon: ChartNoAxesCombined,
                description: "Explore how the community tracks media",
            },
        ],
    },
    {
        title: "Community",
        items: [
            {
                Icon: Trophy,
                title: "Hall of fame",
                path: "/hall-of-fame",
                description: "Community milestones and leaderboards",
            },
            {
                Icon: LibraryBig,
                path: "/collections/discover",
                title: "Community collections",
                description: "Discover collections shared by other members",
            },
            {
                Icon: HeartHandshake,
                path: "/taste-matches",
                title: "Taste matches",
                description: "Find people who share your taste",
            },
        ],
    },
    {
        title: "Games",
        items: [
            {
                title: "Moviedle",
                path: "/moviedle",
                Icon: Clapperboard,
                description: "Guess today’s movie",
            },
            {
                Icon: History,
                path: "/which-came-first",
                title: "Which came first?",
                description: "Put your release-date knowledge to the test",
            },
        ],
    },
];


export function CommunityScreen() {
    const push = useTabPush();
    const [opening, setOpening] = useState(false);

    const open = async (path: string) => {
        setOpening(true);

        try {
            await openBrowserAsync(new URL(path, backendUrl).href);
        }
        catch {
            Alert.alert("Couldn’t open this page", "Please try again.");
        }
        finally {
            setOpening(false);
        }
    };

    return (
        <Page title="Community" subtitle="Discover, connect and play">
            <Content>
                {sections.map((section) => (
                    <Section key={section.title} title={section.title}>
                        {section.items.map(({ title, description, path, Icon }) =>
                            <Pressable
                                key={path}
                                disabled={opening}
                                accessibilityRole={nativePages.has(path) ? "button" : "link"}
                                onPress={() => nativePages.has(path) ? push("/moviedle") : void open(path)}
                                accessibilityLabel={nativePages.has(path) ? title : `${title}. Opens in browser`}
                                style={({ pressed }) => ({
                                    gap: 14,
                                    padding: 16,
                                    alignItems: "center",
                                    flexDirection: "row",
                                    opacity: pressed || opening ? 0.6 : 1,
                                })}
                            >
                                <Icon size={24} color={colors.accent}/>

                                <View style={{ flex: 1, gap: 5 }}>
                                    <AppText style={{ fontWeight: "600" }}>
                                        {title}
                                    </AppText>
                                    <AppText muted style={{ fontSize: 12 }}>
                                        {description}
                                    </AppText>
                                </View>

                                {!nativePages.has(path) && <ExternalLink size={17} color={colors.muted}/>}
                            </Pressable>
                        )}
                    </Section>
                ))}
                <Pressable accessibilityRole="link" accessibilityLabel="Buy me a coffee. Opens in browser" disabled={opening}
                           onPress={() => void open("https://www.buymeacoffee.com/crossoufire")} style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    paddingVertical: 20,
                    opacity: pressed ? 0.6 : 1
                })}>
                    <Coffee size={18} color={colors.rating}/>
                    <AppText style={{ color: colors.rating, fontSize: 13 }}>Buy me a coffee</AppText>
                    <ExternalLink size={14} color={colors.muted}/>
                </Pressable>
            </Content>
        </Page>
    );
}
