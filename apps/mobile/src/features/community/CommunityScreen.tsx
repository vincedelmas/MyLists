import type {Href} from "expo-router";
import {useTabPush} from "../../hooks/use-tab-push";
import {useState} from "react";
import {colors} from "../../theme";
import {backendUrl} from "../../lib/config";
import {openBrowserAsync} from "expo-web-browser";
import {StyleSheet, Alert, Pressable, View} from "react-native";
import {AppText, Content, Page, Section} from "../../components/ui";
import {ChartNoAxesCombined, Clapperboard, ExternalLink, HeartHandshake, History, LibraryBig, Coffee, TrendingUp, Trophy} from "lucide-react-native";


const nativePages = new Map<string, Href>([["/hall-of-fame", "/hall-of-fame"], ["/trends", "/trends"], ["/collections/discover", "/collections"]]);


const sections = [
    {
        title: "In the app",
        items: [
            {
                title: "Trends",
                path: "/trends",
                Icon: TrendingUp,
                description: "What’s popular in movies, series and games",
            },
            {
                title: "Community collections",
                path: "/collections/discover",
                Icon: LibraryBig,
                description: "Discover collections shared by other members",
            },
            {
                title: "Hall of fame",
                path: "/hall-of-fame",
                Icon: Trophy,
                description: "Community milestones and leaderboards",
            },
        ],
    },
    {
        title: "Explore on the web",
        items: [
            {
                title: "Moviedle",
                path: "/moviedle",
                Icon: Clapperboard,
                description: "Guess today’s movie",
            },
            {
                title: "Which came first?",
                path: "/which-came-first",
                Icon: History,
                description: "Put your release-date knowledge to the test",
            },
            {
                title: "Taste matches",
                path: "/taste-matches",
                Icon: HeartHandshake,
                description: "Find people who share your taste",
            },
            {
                title: "Platform stats",
                path: "/platform-stats",
                Icon: ChartNoAxesCombined,
                description: "Explore how the community tracks media",
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
                                onPress={() => {
                                    const destination = nativePages.get(path);
                                    if (destination) push(destination);
                                    else void open(path);
                                }}
                                accessibilityLabel={nativePages.has(path) ? title : `${title}. Opens in browser`}
                                style={({ pressed }) => [styles.communityDestination, (pressed || opening) && styles.pressed]}
                            >
                                <Icon size={24} color={colors.accent}/>
                                <View style={styles.destinationIdentity}>
                                    <View style={styles.destinationHeading}>
                                        <AppText style={styles.destinationTitle}>
                                            {title}
                                        </AppText>
                                        {!nativePages.has(path) &&
                                            <View style={styles.webBadge}>
                                                <AppText style={styles.webBadgeLabel}>
                                                    Web only
                                                </AppText>
                                            </View>
                                        }
                                    </View>
                                    <AppText muted style={styles.destinationDescription}>
                                        {description}
                                    </AppText>
                                </View>
                                {!nativePages.has(path) &&
                                    <ExternalLink size={17} color={colors.muted}/>
                                }
                            </Pressable>
                        )
                        }
                    </Section>
                ))
                }
                <Pressable
                    accessibilityRole="link"
                    accessibilityLabel="Buy me a coffee. Opens in browser"
                    disabled={opening}
                    onPress={() => void open("https://www.buymeacoffee.com/crossoufire")}
                    style={({ pressed }) => [styles.supportLink, pressed && styles.pressed]}
                >
                    <Coffee size={18} color={colors.rating}/>
                    <AppText style={styles.supportLabel}>
                        Buy me a coffee
                    </AppText>
                    <ExternalLink size={14} color={colors.muted}/>
                </Pressable>
            </Content>
        </Page>
    );
}


const styles = StyleSheet.create({
    pressed: { opacity: 0.6 },
    destinationHeading: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8
    },
    webBadge: {
        borderRadius: 5,
        paddingHorizontal: 6,
        paddingVertical: 3,
        backgroundColor: colors.secondary
    },
    webBadgeLabel: { fontSize: 10, color: colors.muted, fontWeight: "600" },
    communityDestination: {
        gap: 14,
        padding: 16,
        alignItems: "center",
        flexDirection: "row"
    },
    destinationIdentity: { flex: 1, gap: 5 },
    destinationTitle: { fontWeight: "600" },
    destinationDescription: { fontSize: 12 },
    supportLink: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 20
    },
    supportLabel: { color: colors.rating, fontSize: 13 },
});
