import {memo, useRef, type ComponentRef} from "react";
import {Pressable, View} from "react-native";
import {MenuView} from "@expo/ui/community/menu";
import {FolderOpen, ListFilter, MoreHorizontal, Pin} from "lucide-react-native";
import {AppText, Cover} from "../../components/ui";
import type {api} from "../../lib/api-client";
import {colors} from "../../theme";

type Library = Awaited<ReturnType<typeof api.library>>;
export type SavedList = (Library["dynamic"][number] & { kind: "dynamic" }) | (Library["collections"][number] & { kind: "collection" });
export const SavedListCard = memo(function SavedListCard({ item, pinned, owner, disabled, onOpen, onAction }: {
    item: SavedList;
    pinned: boolean;
    owner: boolean;
    disabled: boolean;
    onOpen: () => void;
    onAction: (action: string) => void
}) {
    const menu = useRef<ComponentRef<typeof MenuView>>(null);
    const Icon = item.kind === "collection" ? FolderOpen : ListFilter;
    const actions = [{ id: "pin", title: pinned ? "Unpin from profile" : "Pin to profile" }, {
        id: "edit",
        title: item.kind === "collection" ? "Edit collection" : "Edit dynamic list"
    }, { id: "delete", title: item.kind === "collection" ? "Delete collection" : "Delete dynamic list", attributes: { destructive: true } }].map(action => ({
        ...action,
        attributes: { ...action.attributes, disabled }
    }));
    const content = <View style={{ marginBottom: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: "hidden" }}>
        <Pressable accessibilityRole="button" accessibilityLabel={item.title} accessibilityHint={owner ? "Long press for list actions" : undefined}
                   onLongPress={owner ? () => menu.current?.show() : undefined} onPress={onOpen}
                   style={{ padding: 16, minHeight: 88, flexDirection: "row", gap: 12, alignItems: "center" }}><Icon size={23} color={colors.accent}/><View
            style={{ flex: 1, gap: 6 }}><AppText numberOfLines={2} style={{ fontSize: 16, fontWeight: "600" }}>{item.title}</AppText><AppText muted
                                                                                                                                              style={{ fontSize: 12 }}>{item.kind === "dynamic" ? `${item.total} titles · Dynamic list` : `${item.privacy} collection`}</AppText></View>{pinned &&
            <Pin size={15} color={colors.accent}/>}{owner && <Pressable accessibilityRole="button" accessibilityLabel={`Actions for ${item.title}`} onPress={event => {
            event.stopPropagation();
            menu.current?.show();
        }} style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}><MoreHorizontal size={19} color={colors.muted}/></Pressable>}</Pressable>
        {item.kind === "collection" && item.previews.length > 0 &&
            <View pointerEvents="none" style={{ flexDirection: "row", gap: 8, padding: 16, paddingTop: 0 }}>{item.previews.slice(0, 4).map(preview => <Cover
                key={`${preview.mediaType}:${preview.mediaId}`} uri={preview.mediaCover} style={{ width: 48, height: 72, borderRadius: 8 }}/>)}</View>}
    </View>;
    return owner ? <MenuView ref={menu} colorScheme="dark" shouldOpenOnLongPress actions={actions}
                             onPressAction={({ nativeEvent }) => onAction(nativeEvent.event)}>{content}</MenuView> : content;
});
