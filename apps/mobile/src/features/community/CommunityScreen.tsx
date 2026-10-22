import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { openBrowserAsync } from "expo-web-browser";
import {
    ChartNoAxesCombined,
    Clapperboard,
    ExternalLink,
    HeartHandshake,
    History,
    LibraryBig,
    TrendingUp,
    Trophy,
} from "lucide-react-native";
import { colors } from "../../theme";
import { backendUrl } from "../../lib/config";
import { AppText, Content, Page, Section } from "../../components/ui";

const sections = [
    {
        title: "Discover",
        items: [
            {
                title: "Trends",
                description: "What’s popular in movies, series and games",
                path: "/trends",
                Icon: TrendingUp,
            },
            {
                title: "Platform stats",
                description: "Explore how the community tracks media",
                path: "/platform-stats",
                Icon: ChartNoAxesCombined,
            },
        ],
    },
    {
        title: "Community",
        items: [
            {
                title: "Hall of fame",
                description: "Community milestones and leaderboards",
                path: "/hall-of-fame",
                Icon: Trophy,
            },
            {
                title: "Community collections",
                description: "Discover collections shared by other members",
                path: "/collections/discover",
                Icon: LibraryBig,
            },
            {
                title: "Taste matches",
                description: "Find people who share your taste",
                path: "/taste-matches",
                Icon: HeartHandshake,
            },
        ],
    },
    {
        title: "Games",
        items: [
            { title: "Moviedle", description: "Guess today’s movie", path: "/moviedle", Icon: Clapperboard },
            {
                title: "Which came first?",
                description: "Put your release-date knowledge to the test",
                path: "/which-came-first",
                Icon: History,
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
        } catch {
            Alert.alert("Couldn’t open this page", "Please try again.");
        } finally {
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
                        {section.items.map(({ title, description, path, Icon }) => (
                            <Pressable
                                key={path}
                                accessibilityRole="link"
                                accessibilityLabel={`${title}. Opens in browser`}
                                disabled={opening}
                                onPress={() => void open(path)}
                                style={({ pressed }) => ({
                                    padding: 16,
                                    gap: 14,
                                    flexDirection: "row",
                                    alignItems: "center",
                                    opacity: pressed || opening ? 0.6 : 1,
                                })}
                            >
                                <Icon size={24} color={colors.accent} />
                                <View style={{ flex: 1, gap: 5 }}>
                                    <AppText style={{ fontWeight: "600" }}>{title}</AppText>
                                    <AppText muted style={{ fontSize: 12 }}>
                                        {description}
                                    </AppText>
                                </View>
                                <ExternalLink size={17} color={colors.muted} />
                            </Pressable>
                        ))}
                    </Section>
                ))}
            </Content>
        </Page>
    );
}
