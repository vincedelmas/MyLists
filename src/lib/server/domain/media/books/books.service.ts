import {notFound} from "@tanstack/react-router";
import {LogPayload} from "@/lib/types/user-updates.types";
import {pick, uniqueBy} from "@/lib/utils/arrays-objects";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {withTransaction} from "@/lib/server/database/async-storage";
import {saveImageFromUrl} from "@/lib/server/core/images/image-saver";
import {FormattedError, ValidationError} from "@/lib/utils/error-classes";
import {Book, BooksList} from "@/lib/server/domain/media/books/books.types";
import {createMediaService} from "@/lib/server/domain/media/base/media.service";
import {BooksRepository} from "@/lib/server/domain/media/books/books.repository";
import {PagePayload, RedoPayload, StatusPayload} from "@/lib/types/user-media.types";
import {createMediaEditPayloadSchema, type EditMediaDetailsPayloadByType} from "@/lib/schemas/media-details.schema";
import {createBookSchema, type CreateBookPayload, type UpdateUserBookDetailsPayload} from "@/lib/schemas/books.schema";
import {MANUAL_BOOK_ID_PREFIX, BookServerDefinition, booksServerDefinition} from "@/lib/media-definitions/books/book.definition.server";


function toAuthorsData(authors: string) {
    return uniqueBy(authors.split(",")
        .map(name => name.trim()).filter(Boolean)
        .map(name => ({ name })), author => author.name);
}


export function createBooksService(repository: BooksRepository, definition: BookServerDefinition = booksServerDefinition) {
    const { identity, service: servicePolicy } = definition;
    const editPayloadSchema = createMediaEditPayloadSchema(identity.mediaType, servicePolicy.editableFields);

    const service = createMediaService(repository, definition, {
        [UpdateType.PAGE]: updatePageHandler,
        [UpdateType.REDO]: updateRedoHandler,
        [UpdateType.STATUS]: updateStatusHandler,
    });

    async function prepareManualBook(input: CreateBookPayload) {
        const { imageCover: imageUrl, authors, genres, ...fields } = createBookSchema.parse(input);
        const imageCover = await saveImageFromUrl({ dirSaveName: identity.coverDirectory, imageUrl });

        if (imageCover === "default.jpg") {
            throw new ValidationError("imageCover", "Could not download this cover. Choose another image.");
        }

        return () => repository.storeMediaWithDetails({
            authorsData: toAuthorsData(authors),
            genresData: genres.map(name => ({ name })),
            mediaData: {
                ...fields,
                imageCover,
                lockStatus: true,
                apiId: `${MANUAL_BOOK_ID_PREFIX}${crypto.randomUUID()}`,
            },
        });
    }

    async function getMediaEditableFields(mediaId: number) {
        const { editableFields } = servicePolicy;
        const formFields = editableFields.filter(field => field !== "imageCover");
        const media = await repository.findAllAssociatedDetails(mediaId);
        if (!media) throw notFound();

        const values = {
            ...media,
            authors: media.authors.map(author => author.name).join(","),
        };

        return { fields: pick(values, formFields), editableFields };
    }

    async function updateMediaEditableFields(mediaId: number, payload: EditMediaDetailsPayloadByType[typeof MediaType.BOOKS]) {
        const { coverDirectory } = identity;
        payload = editPayloadSchema.parse(payload);

        const media = repository.findById(mediaId);
        if (!media) throw notFound();

        const { imageCover, authors, ...fields } = payload;
        const mediaData: Partial<Book> & Pick<Book, "apiId"> = { ...fields, apiId: media.apiId };

        if (imageCover) {
            mediaData.imageCover = await saveImageFromUrl({ dirSaveName: coverDirectory, imageUrl: imageCover });
        }

        const authorsData = authors === undefined ? undefined : toAuthorsData(authors);

        withTransaction(() => repository.updateMediaWithDetails({ mediaData, authorsData }));
    }

    function updateUserCustomDetails(userId: number, payload: UpdateUserBookDetailsPayload) {
        const media = repository.findById(payload.mediaId);
        if (!media) throw notFound();

        const oldState = repository.findUserMedia(userId, payload.mediaId);
        if (!oldState) throw new FormattedError("Media not in your list");

        let total = oldState.total;
        let actualPage = oldState.actualPage;

        if (payload.customPages !== oldState.customPages) {
            const currentPage = oldState.actualPage ?? 0;
            if (oldState.status !== Status.COMPLETED && oldState.status !== Status.PLANNED && currentPage > payload.customPages) {
                throw new ValidationError("customPages", `Total pages cannot be less than your current page (${currentPage}).`);
            }

            if (oldState.status === Status.COMPLETED) {
                actualPage = payload.customPages;
                total = payload.customPages * (1 + oldState.redo);
            }
            else if (oldState.status === Status.PLANNED) {
                actualPage = 0;
                total = 0;
            }
            else {
                total = currentPage + (oldState.redo * payload.customPages);
            }
        }

        const newState = repository.updateUserMediaDetails(userId, payload.mediaId, {
            total,
            actualPage,
            customTitle: payload.customTitle,
            customPages: payload.customPages,
            customLanguage: payload.customLanguage,
            customPublisher: payload.customPublisher,
            customReleaseDate: payload.customReleaseDate,
        });

        const delta = service.calculateDeltaStats(oldState, newState, media);

        return { media, newState, delta };
    }

    async function batchBooksWithoutGenres(batchSize: number) {
        const booksWithoutGenres = await repository.getBooksWithoutGenres();

        const booksPrompts: string[] = [];
        for (const book of booksWithoutGenres) {
            booksPrompts.push(`
bookApiId: ${book.apiId}
title: ${book.title}
authors: ${book.authors}
description: ${book.synopsis}
----------
`);
        }

        const batches = [];
        for (let i = 0; i < booksPrompts.length; i += batchSize) {
            batches.push(booksPrompts.slice(i, i + batchSize));
        }

        return batches;
    }

    async function addGenresToBook(bookApiId: string, booksGenres: string[]) {
        const mediaData = { apiId: bookApiId };
        const genresData = uniqueBy(booksGenres.map((name) => ({ name })), (genre) => genre.name);

        withTransaction(() => repository.updateMediaWithDetails({ mediaData, genresData }));
    }

    function updateRedoHandler(currentState: BooksList, payload: RedoPayload, _media: Book): [BooksList, LogPayload] {
        const newState = { ...currentState, redo: payload.redo };
        const logPayload = { oldValue: currentState.redo, newValue: payload.redo };

        newState.total = (currentState.actualPage ?? 0) + (payload.redo * currentState.customPages);

        return [newState, logPayload];
    }

    function updateStatusHandler(currentState: BooksList, payload: StatusPayload, _media: Book): [BooksList, LogPayload] {
        const newState = { ...currentState, status: payload.status };
        const logPayload = { oldValue: currentState.status, newValue: payload.status };

        if (payload.status === Status.COMPLETED) {
            newState.total = currentState.customPages + (currentState.redo * currentState.customPages);
            newState.actualPage = currentState.customPages;
        }
        else if (payload.status === Status.PLANNED) {
            newState.redo = 0;
            newState.total = 0;
            newState.actualPage = 0;
        }

        return [newState, logPayload];
    }

    function updatePageHandler(currentState: BooksList, payload: PagePayload, _media: Book): [BooksList, LogPayload] {
        if (payload.actualPage > currentState.customPages) {
            throw new FormattedError("Invalid page");
        }

        const newState = {
            ...currentState,
            actualPage: payload.actualPage,
            status: currentState.customPages > 0 && payload.actualPage === currentState.customPages
                ? Status.COMPLETED
                : currentState.status,
        };

        newState.total = payload.actualPage + (currentState.redo * currentState.customPages);

        return [newState, { oldValue: currentState.actualPage, newValue: payload.actualPage }];
    }

    return {
        ...service,
        addGenresToBook,
        updateRedoHandler,
        updatePageHandler,
        prepareManualBook,
        updateStatusHandler,
        getMediaEditableFields,
        updateUserCustomDetails,
        batchBooksWithoutGenres,
        updateMediaEditableFields,
    };
}


export type BooksService = ReturnType<typeof createBooksService>;
