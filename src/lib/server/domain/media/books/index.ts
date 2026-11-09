import {createBooksService} from "@/lib/server/domain/media/books/books.service";
import {createBooksRepository} from "@/lib/server/domain/media/books/books.repository";
import {booksServerDefinition} from "@/lib/media-definitions/books/book.definition.server";
import {createBooksAchievementCatalog} from "@/lib/server/domain/media/books/books.achievements";
import {createBooksMonthlyActivity, createBooksStatistics} from "@/lib/server/domain/media/books/books.statistics";


export function createBooksModule() {
    const definition = booksServerDefinition;
    const repository = createBooksRepository(definition);

    return {
        repository,
        mediaType: definition.identity.mediaType,
        statistics: createBooksStatistics(definition),
        service: createBooksService(repository, definition),
        achievements: createBooksAchievementCatalog(definition),
        monthlyActivity: createBooksMonthlyActivity(definition, repository),
    };
}


export * from "./books.service";
export * from "./books.repository";
export * from "./books.statistics";
