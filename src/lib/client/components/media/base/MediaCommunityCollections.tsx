import {useSuspenseQuery} from "@tanstack/react-query";
import {CollectionCard} from "@/lib/client/components/collections/CollectionCard";
import {MediaSectionTitle} from "@/lib/client/components/media/base/MediaDetailsComps";
import {mediaCommunityCollectionsOptions} from "@/lib/client/react-query/query-options";


interface MediaCommunityCollectionsProps {
    queryOptions: ReturnType<typeof mediaCommunityCollectionsOptions>;
}


export const MediaCommunityCollections = ({ queryOptions }: MediaCommunityCollectionsProps) => {
    const collections = useSuspenseQuery(queryOptions).data;
    if (!collections.length) return null;

    return (
        <section>
            <MediaSectionTitle title="Popular Collections"/>
            <div className="grid gap-3 grid-cols-1">
                {collections.map((collection) =>
                    <CollectionCard
                        key={collection.id}
                        collection={collection}
                    />
                )}
            </div>
        </section>
    );
};
