import {CollectionStats} from "./collection-stats";
import {memo} from "react";
import {Pressable, StyleSheet, View} from "react-native";
import {ChevronRight, ListOrdered} from "lucide-react-native";
import {AppText, Cover} from "../../../components/ui";
import {Avatar} from "../../../components/avatar";
import {useTabPush} from "../../../hooks/use-tab-push";
import type {api} from "../../../lib/api-client";
import {mediaColors, mediaIcons, mediaLabels} from "../../../lib/media";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {formatNumber} from "@/lib/utils/formatting/number";
import {colors, commonStyles} from "../../../theme";


type Collection = Awaited<ReturnType<typeof api.communityCollections>>["items"][number];


export const CollectionCard = memo(function CollectionCard({ collection }: { collection: Collection }) {
    const push = useTabPush();

    return (
        <View style={styles.card}>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${collection.title}, ${collection.itemsCount} media`}
                onPress={() => push({
                    pathname: "/collections/[collectionId]",
                    params: { collectionId: collection.id }
                })}
                style={({ pressed }) => [styles.openButton, pressed && commonStyles.pressed]}
            >
                <View pointerEvents="none" style={styles.previews}>
                    {collection.previews.slice(0, 4).map(preview =>
                        <Cover
                            key={`${preview.mediaType}:${preview.mediaId}`}
                            uri={preview.mediaCover}
                            style={styles.preview}
                        />
                    )
                    }
                </View>
                <View style={styles.heading}>
                    <AppText
                        heading
                        numberOfLines={2}
                        style={styles.title}
                    >
                        {collection.title}
                    </AppText>
                    <ChevronRight size={18} color={colors.muted}/>
                </View>
                <View style={styles.metadata}>
                    <AppText muted style={styles.caption}>
                        {formatNumber(collection.itemsCount, { locale: "en" })} media
                    </AppText>
                    {collection.ordered &&
                        <View style={styles.stat}>
                            <ListOrdered size={13} color={colors.muted}/>
                            <AppText muted style={styles.caption}>
                                Ranked
                            </AppText>
                        </View>
                    }
                    {ALL_MEDIA_TYPES.filter(type => collection.mediaTypes.includes(type)).map(type => {
                        const Icon = mediaIcons[type];

                        return (
                            <Icon
                                key={type}
                                size={15}
                                color={mediaColors[type]}
                                accessibilityLabel={mediaLabels[type]}
                            />
                        );
                    })
                    }
                </View>
                {collection.description &&
                    <AppText
                        muted
                        numberOfLines={2}
                        style={styles.description}
                    >
                        {collection.description}
                    </AppText>
                }
                <CollectionStats collection={collection}/>
            </Pressable>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View ${collection.ownerName}'s profile`}
                onPress={() => push({
                    pathname: "/people/[userId]",
                    params: { userId: collection.ownerId }
                })}
                style={({ pressed }) => [styles.owner, pressed && commonStyles.pressed]}
            >
                <Avatar
                    image={collection.ownerImage}
                    name={collection.ownerName}
                    size={24}
                />
                <AppText
                    muted
                    numberOfLines={1}
                    style={styles.caption}
                >
                    {collection.ownerName}
                </AppText>
            </Pressable>
        </View>
    );
});


const styles = StyleSheet.create({
    card: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        overflow: "hidden"
    },
    openButton: { padding: 16, gap: 12 },
    previews: { flexDirection: "row", gap: 8 },
    preview: {
        flex: 1,
        height: undefined,
        aspectRatio: 2 / 3,
        maxWidth: "24%",
        borderRadius: 8
    },
    heading: { flexDirection: "row", alignItems: "center", gap: 12 },
    title: { flex: 1, fontSize: 18, lineHeight: 25 },
    metadata: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12
    },
    stat: { flexDirection: "row", alignItems: "center", gap: 5 },
    caption: { fontSize: 12 },
    description: { fontSize: 13, lineHeight: 20 },
    owner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        minHeight: 48,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border
    },
});
