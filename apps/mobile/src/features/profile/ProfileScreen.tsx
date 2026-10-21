import {useState} from "react";
import {assetUrl} from "../../lib/api-client";
import {useQuery} from "@tanstack/react-query";
import {authClient} from "../../lib/auth-client";
import {colors, commonStyles} from "../../theme";
import {SafeAreaView} from "react-native-safe-area-context";
import {formatActivity, formatCount, mediaPresentation} from "./profile-formatting";
import {useSignOutMutation} from "../../lib/react-query/query-mutations/auth.mutations";
import {profileOptions, profileActivityOptions} from "../../lib/react-query/query-options/profile.options";
import {ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View} from "react-native";


export function ProfileScreen() {
    const { data: session } = authClient.useSession();
    const user = session!.user;

    const signOut = useSignOutMutation();
    const query = useQuery(profileOptions);
    const activity = useQuery(profileActivityOptions);
    const [avatarFailed, setAvatarFailed] = useState(false);

    const signOutError = signOut.error?.message;
    const isSigningOut = signOut.isPending;

    const data = query.data;
    const stats = data?.stats;

    return (
        <SafeAreaView style={commonStyles.screen} edges={["top", "left", "right"]}>
            <View style={styles.navigation}>
                <Text style={commonStyles.brand}>
                    MyLists.
                </Text>
                <Text style={styles.navigationTitle}>
                    YOUR PROFILE
                </Text>
                <Pressable
                    disabled={isSigningOut}
                    accessibilityRole="button"
                    onPress={() => signOut.mutate()}
                    accessibilityState={{ disabled: isSigningOut, busy: isSigningOut }}
                    style={({ pressed }) => [styles.signOut, pressed && commonStyles.pressed]}
                >
                    {isSigningOut
                        ?
                        <ActivityIndicator
                            color={colors.accent}
                        />
                        :
                        <Text style={styles.link}>
                            Sign out
                        </Text>
                    }
                </Pressable>
            </View>

            {!data ?
                <View style={commonStyles.centered}>
                    {query.isPending ?
                        <>
                            <ActivityIndicator
                                color={colors.accent}
                                accessibilityLabel="Loading your profile"
                            />
                            <Text style={[commonStyles.body, styles.centerText]}>
                                Getting your collection together...
                            </Text>
                        </>
                        :
                        <View style={commonStyles.content}>
                            <Text style={commonStyles.title}>
                                Let’s try again.
                            </Text>
                            <Text accessibilityRole="alert" style={commonStyles.body}>
                                We couldn’t load your profile. Check your connection and try again.
                            </Text>
                            <Pressable accessibilityRole="button" style={commonStyles.button} onPress={() => void query.refetch()}>
                                <Text style={commonStyles.buttonText}>
                                    Try again
                                </Text>
                            </Pressable>
                        </View>
                    }
                    {signOutError &&
                        <Text accessibilityRole="alert" style={commonStyles.error}>
                            {signOutError}
                        </Text>
                    }
                </View>
                :
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    refreshControl={
                        <RefreshControl
                            tintColor={colors.accent} colors={[colors.accent]}
                            refreshing={query.isRefetching || activity.isRefetching}
                            onRefresh={() => {
                                void query.refetch();
                                void activity.refetch();
                            }}
                        />
                    }
                >
                    <View style={styles.banner}>
                        <Image
                            resizeMode="cover"
                            style={StyleSheet.absoluteFill}
                            source={{ uri: assetUrl(data.user.backgroundImage) }}
                        />
                        <View style={styles.bannerShade}/>
                        <Text style={styles.bannerCaption}>
                            A LIFE IN STORIES
                        </Text>
                    </View>

                    <View style={styles.content}>
                        <View style={styles.identity}>
                            <View style={styles.avatar}>
                                {data.user.image && !avatarFailed ?
                                    <Image
                                        style={styles.avatarImage}
                                        source={{ uri: assetUrl(data.user.image) }}
                                        onError={() => setAvatarFailed(true)}
                                    />
                                    :
                                    <Text style={styles.initial}>
                                        {user.name.slice(0, 1).toUpperCase()}
                                    </Text>
                                }
                            </View>
                            <View style={styles.privacyPill}>
                                <View style={styles.privacyDot}/>
                                <Text style={styles.privacy}>
                                    {data.user.privacy} profile
                                </Text>
                            </View>
                        </View>

                        <View style={styles.nameBlock}>
                            <Text accessibilityRole="header" style={styles.name}>{data.user.name}</Text>
                            <Text style={styles.memberSince}>Collecting since {new Date(data.user.createdAt).toLocaleDateString("en", {
                                month: "long",
                                year: "numeric",
                                timeZone: "UTC"
                            })}</Text>
                            <View style={styles.socialCounts}>
                                <Text style={styles.social}><Text style={styles.socialValue}>{formatCount(data.social.followersCount)}</Text> followers</Text>
                                <Text style={styles.social}><Text style={styles.socialValue}>{formatCount(data.social.followsCount)}</Text> following</Text>
                            </View>
                        </View>

                        {(query.isError || signOutError) && (
                            <Text accessibilityRole="alert" style={commonStyles.error}>{signOutError ?? "Couldn’t refresh your profile. Pull down to try again."}</Text>
                        )}

                        <View style={styles.statsGrid}>
                            {[
                                { label: "Entries", value: formatCount(stats!.totalEntries) },
                                { label: "Hours spent", value: formatCount(stats!.totalHours) },
                                { label: "Favorites", value: formatCount(stats!.totalFavorites) },
                                data.user.ratingSystem === "score"
                                    ? { label: "Avg. rating / 10", value: stats!.avgRated === null ? "—" : stats!.avgRated.toFixed(1) }
                                    : { label: "Rated entries", value: formatCount(stats!.totalRated) },
                            ].map(stat => (
                                <View key={stat.label} style={styles.stat}>
                                    <Text style={styles.statValue}>{stat.value}</Text>
                                    <Text style={styles.statLabel}>{stat.label}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={styles.section}>
                            <View style={styles.sectionHeading}>
                                <Text accessibilityRole="header" style={styles.sectionTitle}>Your collection</Text>
                                <Text style={styles.sectionNote}>{data.lists.length} lists</Text>
                            </View>
                            {data.lists.length === 0 ? <Text style={commonStyles.body}>Activate a media list on MyLists to start your collection.</Text> : (
                                <View style={styles.collection}>
                                    {data.lists.map(media => {
                                        const presentation = mediaPresentation[media.mediaType];
                                        return (
                                            <View key={media.mediaType} style={styles.mediaRow}>
                                                <View style={[styles.mediaMark, { borderColor: presentation.color }]}>
                                                    <Text style={[styles.mediaMarkText, { color: presentation.color }]}>{presentation.mark}</Text>
                                                </View>
                                                <View style={styles.mediaInfo}>
                                                    <Text style={styles.mediaLabel}>{presentation.label}</Text>
                                                    <Text style={styles.mediaDetail}>{formatCount(media.entriesFavorites)} favorites · {formatCount(media.timeSpent)} hours</Text>
                                                </View>
                                                <Text style={styles.mediaCount}>{formatCount(media.totalEntries)}</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </View>

                        {data.highlights.mode !== "disabled" && (
                            <View style={styles.section}>
                                <Text accessibilityRole="header" style={styles.sectionTitle}>{data.highlights.title}</Text>
                                {data.highlights.items.length === 0 ?
                                    <Text style={commonStyles.body}>No highlighted titles yet. Your favorites will find a home here.</Text> : (
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.highlights}>
                                            {data.highlights.items.map(item => (
                                                <View key={`${item.mediaType}:${item.mediaId}`} style={styles.highlight}>
                                                    <View style={styles.poster}>
                                                        <Text style={styles.posterInitial}>{item.mediaName.slice(0, 1)}</Text>
                                                        <Image source={{ uri: assetUrl(item.mediaCover) }} style={StyleSheet.absoluteFill} resizeMode="cover"/>
                                                    </View>
                                                    <Text numberOfLines={2} style={styles.highlightTitle}>{item.mediaName}</Text>
                                                    <Text style={styles.highlightType}>{mediaPresentation[item.mediaType].label}</Text>
                                                </View>
                                            ))}
                                        </ScrollView>
                                    )}
                            </View>
                        )}

                        <View style={styles.section}>
                            <Text accessibilityRole="header" style={styles.sectionTitle}>Recently in your world</Text>
                            {activity.isPending ? <ActivityIndicator color={colors.accent}/> : activity.isError ? (
                                <Pressable accessibilityRole="button" onPress={() => void activity.refetch()}>
                                    <Text style={commonStyles.error}>Couldn’t load activity. Tap to retry.</Text>
                                </Pressable>
                            ) : activity.data.length === 0 ?
                                <Text style={commonStyles.body}>Your story starts with your first update. Add or track something on MyLists to see it here.</Text> : (
                                    <View>
                                        {activity.data.map(update => (
                                            <View key={update.id} style={styles.activityRow}>
                                                <View style={[styles.activityDot, { backgroundColor: mediaPresentation[update.mediaType].color }]}/>
                                                <View style={styles.activityInfo}>
                                                    <Text style={styles.mediaLabel}>{update.mediaName}</Text>
                                                    <Text style={styles.activityDescription}>{formatActivity(update, data.user.ratingSystem)}</Text>
                                                </View>
                                                <Text style={styles.activityDate}>{new Date(update.timestamp).toLocaleDateString("en", { day: "numeric", month: "short" })}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                        </View>

                        <Text style={styles.footer}>Your tastes. Your pace. Your collection.</Text>
                    </View>
                </ScrollView>
            }
        </SafeAreaView>
    );
}


const styles = StyleSheet.create({
    navigation: { paddingHorizontal: 24, paddingVertical: 8, minHeight: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    navigationTitle: { fontSize: 9, letterSpacing: 1.6, color: colors.muted, flexShrink: 1 },
    signOut: { minHeight: 44, justifyContent: "center", paddingLeft: 8 },
    link: { color: colors.accent, fontSize: 13, fontWeight: "600" },
    centerText: { textAlign: "center" },
    scroll: { paddingBottom: 40 },
    banner: { height: 174, backgroundColor: colors.surface, justifyContent: "flex-end", padding: 24 },
    bannerShade: { ...StyleSheet.absoluteFill, backgroundColor: "#11181655" },
    bannerCaption: { color: colors.text, fontSize: 10, letterSpacing: 3, fontWeight: "700", alignSelf: "flex-end", marginBottom: 5 },
    content: { width: "100%", maxWidth: 680, alignSelf: "center", paddingHorizontal: 24, gap: 28 },
    identity: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: -45 },
    avatar: {
        height: 96,
        width: 96,
        borderRadius: 30,
        borderWidth: 5,
        borderColor: colors.background,
        backgroundColor: colors.accent,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center"
    },
    avatarImage: { height: "100%", width: "100%" },
    initial: { fontSize: 38, fontWeight: "700", color: colors.accentText },
    privacyPill: { flexDirection: "row", alignItems: "center", gap: 6, padding: 9, borderRadius: 20, backgroundColor: colors.surface, marginBottom: 5 },
    privacyDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent },
    privacy: { fontSize: 11, color: colors.muted, textTransform: "capitalize" },
    nameBlock: { gap: 8, marginTop: -14 },
    name: { color: colors.text, fontSize: 34, fontWeight: "700", letterSpacing: -1.2 },
    memberSince: { color: colors.muted, fontSize: 13 },
    socialCounts: { flexDirection: "row", flexWrap: "wrap", gap: 24, marginTop: 8 },
    social: { color: colors.muted, fontSize: 14 },
    socialValue: { color: colors.text, fontWeight: "700" },
    statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    stat: { width: "48%", flexGrow: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 18, gap: 7 },
    statValue: { color: colors.accent, fontSize: 30, fontWeight: "600", letterSpacing: -1 },
    statLabel: { color: colors.muted, fontSize: 12 },
    section: { gap: 16 },
    sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    sectionTitle: { color: colors.text, fontSize: 20, fontWeight: "600", letterSpacing: -0.5, flexShrink: 1 },
    sectionNote: { color: colors.muted, fontSize: 12 },
    collection: { borderTopWidth: 1, borderTopColor: colors.border },
    mediaRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.border },
    mediaMark: { height: 42, width: 36, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    mediaMarkText: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
    mediaInfo: { flex: 1, gap: 4 },
    mediaLabel: { color: colors.text, fontSize: 14, fontWeight: "600", lineHeight: 21 },
    mediaDetail: { color: colors.muted, fontSize: 11, lineHeight: 17 },
    mediaCount: { color: colors.text, fontSize: 20, fontWeight: "600" },
    highlights: { gap: 14, paddingBottom: 4 },
    highlight: { width: 126, gap: 7 },
    poster: { height: 184, borderRadius: 10, backgroundColor: colors.surface, overflow: "hidden", alignItems: "center", justifyContent: "center" },
    posterInitial: { color: colors.muted, fontSize: 42, fontWeight: "700" },
    highlightTitle: { color: colors.text, fontSize: 13, fontWeight: "600", lineHeight: 19 },
    highlightType: { color: colors.muted, fontSize: 11 },
    activityRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.border },
    activityDot: { width: 7, height: 7, borderRadius: 4, marginTop: 7 },
    activityInfo: { flex: 1, gap: 4 },
    activityDescription: { color: colors.muted, fontSize: 12, lineHeight: 19 },
    activityDate: { color: colors.muted, fontSize: 10, marginTop: 4 },
    footer: { color: colors.muted, textAlign: "center", fontSize: 11, paddingVertical: 12, letterSpacing: 0.5 },
});
