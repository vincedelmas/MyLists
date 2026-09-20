import {useQuery} from "@tanstack/react-query";
import {Link} from "@tanstack/react-router";
import {GitMerge} from "lucide-react";
import {MediaType} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {formatLocaleName} from "@/lib/utils/formatting/text";
import {getBookEditions} from "@/lib/server/functions/book-editions";
import {Button} from "@/lib/client/components/ui/button";
import {Alert, AlertDescription, AlertTitle} from "@/lib/client/components/ui/alert";
import type {MediaDetailsPresentationProps, MediaDetailsProps} from "../media-config.types";
import {BookAddToList} from "./BookEditionPicker";
import {BookCoverEditDialog} from "./BookCoverEditDialog";

export function BookDetailsPresentation({media, userMedia, search, onSearchChange, queryOption, children}: MediaDetailsPresentationProps<typeof MediaType.BOOKS>) {
    const editionId = userMedia ? userMedia.editionId : search.editionId;
    const editions = useQuery({queryKey: ["bookEditions", media.id], queryFn: () => getBookEditions({data: {mediaId: media.id}}), enabled: !!editionId});
    const edition = editions.data?.find(item => item.id === editionId);
    const displayMedia = {...media,
        name: edition?.name ?? media.name,
        synopsis: edition?.synopsis ?? media.synopsis,
        imageCover: userMedia?.customCover ?? (edition && !edition.imageCover.endsWith("/default.jpg") ? edition.imageCover : media.imageCover),
        providerData: {...media.providerData, url: edition ? `https://books.google.com/books?id=${encodeURIComponent(edition.apiId)}` : media.providerData.url},
    };
    return children({media: displayMedia,
        notice: edition && <Alert data-testid="book-edition-presentation">
            <AlertTitle>{userMedia ? "Your edition" : "Selected edition"}{edition.language ? ` · ${formatLocaleName(edition.language, "language")}` : ""}</AlertTitle>
            <AlertDescription><p>{[edition.publishers, edition.releaseDate ? `Edition published ${edition.releaseDate.slice(0, 4)}` : null].filter(Boolean).join(" · ")}</p>
                <p>Shared book: {media.name}. Readers and ratings include all editions.</p>
            </AlertDescription>
        </Alert>,
        addToList: <BookAddToList key={`${media.id}:${search.editionId ?? "none"}`} mediaId={media.id} initialEditionId={search.editionId} queryOption={queryOption}
            onEditionChange={id => onSearchChange({editionId: id ?? undefined})}/>,
    });
}

export function BookCatalogueActions({mediaId}: {mediaId: number}) {
    const {currentUser} = useAuth();
    return currentUser?.capabilities.enterAdminDashboard && <Button size="sm" variant="hover" render={<Link to="/books/manage" search={{workId: mediaId}}/>}>
        <GitMerge data-icon="inline-start"/> Editions
    </Button>;
}

export function BookCoverAction({media}: MediaDetailsProps<typeof MediaType.BOOKS>) {
    return media.imageCover.endsWith("/default.jpg") && <BookCoverEditDialog mediaId={media.id} mediaName={media.name}/>;
}
