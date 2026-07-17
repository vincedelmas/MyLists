import {MediaType} from "@/lib/utils/enums";
import {assertNever} from "@/lib/utils/assert-never";
import type {CatalogEditFields} from "@/lib/contracts/media/catalog-edit";
import {
    BookCatalogEditForm,
    GameCatalogEditForm,
    MangaCatalogEditForm,
    MovieCatalogEditForm,
    TvCatalogEditForm
} from "@/lib/client/components/features/catalog-edit/KindCatalogEditForms";


export const CatalogEditKindBoundary = ({ mediaId, data }: { mediaId: number; data: CatalogEditFields }) => {
    switch (data.kind) {
        case MediaType.SERIES:
            return <TvCatalogEditForm mediaType={MediaType.SERIES} mediaId={mediaId} fields={data.fields}/>;
        case MediaType.ANIME:
            return <TvCatalogEditForm mediaType={MediaType.ANIME} mediaId={mediaId} fields={data.fields}/>;
        case MediaType.MOVIES:
            return <MovieCatalogEditForm mediaId={mediaId} fields={data.fields}/>;
        case MediaType.GAMES:
            return <GameCatalogEditForm mediaId={mediaId} fields={data.fields}/>;
        case MediaType.BOOKS:
            return <BookCatalogEditForm mediaId={mediaId} fields={data.fields}/>;
        case MediaType.MANGA:
            return <MangaCatalogEditForm mediaId={mediaId} fields={data.fields}/>;
        default:
            return assertNever(data, "catalog edit family");
    }
};
