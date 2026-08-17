import {XLineTop} from "lucide-react";
import {MediaType} from "@/lib/utils/enums";
import {formatNumber} from "@/lib/utils/number-formatting";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {BookListItem} from "@/lib/client/components/media/books/BookListItem";
import {booksDefinition} from "@/lib/media-definitions/books/books.definition";
import {BooksInfoGrid} from "@/lib/client/components/media/books/BooksInfoGrid";
import {BooksOverTitle} from "@/lib/client/components/media/books/BooksOverTitle";
import {BookFollowCard} from "@/lib/client/components/media/books/BookFollowCard";
import {defineMediaConfig} from "@/lib/client/components/media/media-config.types";
import {BooksUnderTitle} from "@/lib/client/components/media/books/BooksUnderTitle";
import {BooksUserDetails} from "@/lib/client/components/media/books/BookUserDetails";
import {getBooksColumns} from "@/lib/client/components/media/books/BooksListColumns";
import {getBooksActiveFilters} from "@/lib/client/components/media/books/BooksActiveFilters";
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
    sheetFilters: getBooksActiveFilters,
    communityActivity: {
        countLabel: "Read",
        extraLabel: "Rereads",
        extraMetric: "totalRedo",
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
