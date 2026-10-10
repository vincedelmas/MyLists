import {useQueryClient} from "@tanstack/react-query";
import {MediaListResults} from "@/lib/client/components/media/base/MediaListResults";
import type {dynamicListOptions} from "@/lib/client/react-query/query-options/dynamic-lists.options";


type DynamicListItem = Awaited<ReturnType<NonNullable<ReturnType<typeof dynamicListOptions>["queryFn"]>>>["results"]["items"][number];


interface DynamicListResultsProps {
    isOwner: boolean;
    username: string;
    items: DynamicListItem[];
    display: "grid" | "table";
}


export const DynamicListResults = ({ items, display, isOwner, username }: DynamicListResultsProps) => {
    const queryClient = useQueryClient();

    const handleEdited = async () => {
        await queryClient.invalidateQueries({ queryKey: ["dynamic-lists"] });
    };

    return (
        <MediaListResults
            display={display}
            username={username}
            isCurrent={isOwner}
            isConnected={isOwner}
            onEdited={handleEdited}
            items={items.map(item => ({ ...item, userMedia: item }))}
        />
    );
};
