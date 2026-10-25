import {useState} from "react";
import {ContinueActions} from "../profile/ContinueActions";
import {Page} from "../../components/ui";
import {MediaList} from "../../components/media-list";
import {settingsOptions} from "../../lib/react-query/query-options/settings.options";
import {useInfiniteQuery, useQuery} from "@tanstack/react-query";
import {useIsFocused, useLocalSearchParams} from "expo-router";
import {LayoutToggle, type MediaLayout} from "../../components/layout-toggle";
import {libraryDetailOptions} from "../../lib/react-query/query-options/library.options";


export function LibraryDetailScreen() {
    const focused = useIsFocused();
    const settings = useQuery({ ...settingsOptions, enabled: focused });
    const [selectedLayout, setLayout] = useState<MediaLayout | null>(null);
    const layout = selectedLayout ?? (settings.data?.gridListView === false ? "list" : "grid");
    const { kind, id, userId } = useLocalSearchParams<{ kind: "collection" | "dynamic" | "continue"; id?: string; userId?: string }>();
    const query = useInfiniteQuery({
        ...libraryDetailOptions(kind, id ? Number(id) : undefined, userId ? Number(userId) : undefined),
        enabled: focused,
    });

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const first = query.data?.pages[0];
    const items = query.data?.pages.flatMap((page) => page.items) ?? [];

    const selected = items.find(item => `${item.mediaType}:${item.mediaId}` === selectedId);

    return (
        <Page
            back={true}
            action={<LayoutToggle value={layout} onChange={setLayout}/>}
            title={first?.title ?? (kind === "continue" ? "Continue" : "List")}
        >
            <MediaList
                query={query}
                onItemPress={kind === "continue" && !userId ? item => setSelectedId(`${item.mediaType}:${item.mediaId}`) : undefined}
                items={items}
                layout={layout}
                ratingSystem={first?.ratingSystem ?? "score"}
                emptyTitle="No titles here yet"
            />
            {selected && <ContinueActions item={selected} dismiss={() => setSelectedId(null)}/>}
        </Page>
    );
}
