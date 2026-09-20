import {sql} from "drizzle-orm";
import {books, booksList} from "@/lib/server/database/schema/media/books.schema";

export const bookListTitle = sql<string>`COALESCE(
    (SELECT name FROM book_editions WHERE id = ${booksList.editionId}), ${booksList.editionName}, ${books.name}
)`;
export const bookListCover = sql<string>`COALESCE(
    NULLIF((SELECT image_cover FROM book_editions WHERE id = ${booksList.editionId}), 'default.jpg'), ${books.imageCover}
)`.mapWith(books.imageCover);
