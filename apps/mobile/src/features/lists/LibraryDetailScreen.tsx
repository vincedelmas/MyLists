import {useState} from "react";
import {Page} from "../../components/ui";
import {MediaList} from "../../components/media-list";
import {useInfiniteQuery} from "@tanstack/react-query";
import {useIsFocused, useLocalSearchParams} from "expo-router";
import {LayoutToggle, type MediaLayout} from "../../components/layout-toggle";
import {libraryDetailOptions} from "../../lib/react-query/query-options/library.options";


export function LibraryDetailScreen() {
    const focused = useIsFocused();
    const [layout, setLayout] = useState<MediaLayout>("grid");
    const { kind, id, userId } = useLocalSearchParams<{ kind: "collection" | "dynamic" | "continue"; id?: string; userId?: string }>();
    const query = useInfiniteQuery({
        ...libraryDetailOptions(kind, id ? Number(id) : undefined, userId ? Number(userId) : undefined),
        enabled: focused,
    });

    const first = query.data?.pages[0];
    const items = query.data?.pages.flatMap((page) => page.items) ?? [];

    return (
        <Page
            back={true}
            action={<LayoutToggle value={layout} onChange={setLayout}/>}
            title={first?.title ?? (kind === "continue" ? "Continue" : "List")}
        >
            <MediaList
                query={query}
                items={items}
                layout={layout}
                ratingSystem={first?.ratingSystem ?? "score"}
                emptyTitle="No titles here yet"
            />
        </Page>
    );
}
