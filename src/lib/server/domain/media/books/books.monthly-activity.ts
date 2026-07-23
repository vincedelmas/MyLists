import {BooksRepository} from "@/lib/server/domain/media/books/books.repository";
import {BookServerDefinition} from "@/lib/media-definitions/books/book.definition.server";
import {createMediaMonthlyActivity} from "@/lib/server/domain/media/base/base.monthly-activity";


export function createBooksMonthlyActivity(definition: BookServerDefinition, repository: BooksRepository) {
    return createMediaMonthlyActivity({ definition, repository });
}
