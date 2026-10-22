import {useState} from "react";
import {colors} from "../../theme";
import {backendUrl} from "../../lib/config";
import {openBrowserAsync} from "expo-web-browser";
import {Alert, Pressable, View} from "react-native";
import {AppText, Content, Page, Section} from "../../components/ui";
import {ChartNoAxesCombined, Clapperboard, ExternalLink, HeartHandshake, History, LibraryBig, TrendingUp, Trophy} from "lucide-react-native";


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
                <AppText muted style={{ fontSize: 12 }}>
                    These sections currently open in your browser.
                </AppText>
                {sections.map((section) => (
                    <Section key={section.title} title={section.title}>
                        {section.items.map(({ title, description, path, Icon }) =>
                            <Pressable
                                key={path}
                                disabled={opening}
                                accessibilityRole="link"
                                onPress={() => void open(path)}
                                accessibilityLabel={`${title}. Opens in browser`}
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

                                <ExternalLink
                                    size={17}
                                    color={colors.muted}
                                />
                            </Pressable>
                        )}
                    </Section>
                ))}
            </Content>
        </Page>
    );
}
