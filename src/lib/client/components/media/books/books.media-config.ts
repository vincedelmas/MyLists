import {PenLine, XLineTop} from "lucide-react";
import {JobType, MediaType} from "@/lib/utils/enums";
import {formatNumber} from "@/lib/utils/formatting/number";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {formatLocaleName} from "@/lib/utils/formatting/text";
import {BookListItem} from "@/lib/client/components/media/books/BookListItem";
import {booksDefinition} from "@/lib/media-definitions/books/books.definition";
import {BooksInfoGrid} from "@/lib/client/components/media/books/BooksInfoGrid";
import {BooksOverTitle} from "@/lib/client/components/media/books/BooksOverTitle";
import {BookFollowCard} from "@/lib/client/components/media/books/BookFollowCard";
import {defineMediaConfig} from "@/lib/client/components/media/media-config.types";
import {BooksUnderTitle} from "@/lib/client/components/media/books/BooksUnderTitle";
import {BooksUserDetails} from "@/lib/client/components/media/books/BookUserDetails";
import {getBooksColumns} from "@/lib/client/components/media/books/BooksListColumns";
import {getBooksContinueProgress} from "@/lib/client/components/media/books/continue-progress";
import {bookSearchFilterDefinition} from "@/lib/client/components/media/books/BookSearchFilters";


export const booksMediaConfig = defineMediaConfig({
    mediaType: MediaType.BOOKS,
    infoGrid: BooksInfoGrid,
    overTitle: BooksOverTitle,
    underTitle: BooksUnderTitle,
    mediaListCard: BookListItem,
    mediaFollowCard: BookFollowCard,
    mediaListColumns: getBooksColumns,
    mediaUserDetails: BooksUserDetails,
    metadataFilters: {
        authors: { title: "Authors", type: "search" },
        langs: { title: "Languages", type: "checkbox", render: name => formatLocaleName(name, "language") },
    },
    continue: {
        getProgress: getBooksContinueProgress,
    },
    communityActivity: {
        countLabel: "Read",
        extraLabel: "Rereads",
        extraMetric: "totalRedo",
    },
    jobs: {
        [JobType.CREATOR]: {
            icon: PenLine,
            label: "Author",
            descriptionSuffix: "",
            sectionTitle: "Bibliography",
            descriptionVerb: "written by",
        },
    },
    statistics: {
        getStatCards: (stats) => [
            {
                icon: XLineTop,
                title: "Avg. Book Length",
                value: stats.specificMediaStats.avgDuration === null
                    ? DEFAULT_DASH_FALLBACK
                    : `${formatNumber(stats.specificMediaStats.avgDuration)} pages`,
            },
        ],
    },
    advancedSearch: {
        provider: booksDefinition.externalSearch.provider,
        ...bookSearchFilterDefinition,
    },
});
