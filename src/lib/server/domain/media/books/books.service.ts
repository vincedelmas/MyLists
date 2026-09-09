import {pick, uniqueBy} from "@/lib/utils/arrays-objects";
import {notFound} from "@tanstack/react-router";
import {FormattedError} from "@/lib/utils/error-classes";
import {LogPayload} from "@/lib/types/user-updates.types";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {withTransaction} from "@/lib/server/database/async-storage";
import {createMediaService} from "@/lib/server/domain/media/base/media.service";
import {Book, BooksList} from "@/lib/server/domain/media/books/books.types";
import {saveImageFromUrl, saveUploadedImage} from "@/lib/server/core/images/image-saver";
import {BooksRepository} from "@/lib/server/domain/media/books/books.repository";
import {PagePayload, RedoPayload, StatusPayload} from "@/lib/types/user-media.types";
import {createMediaEditPayloadSchema, type EditMediaDetailsPayloadByType} from "@/lib/schemas/media-details.schema";
import {BookServerDefinition, booksServerDefinition} from "@/lib/media-definitions/books/book.definition.server";


export function createBooksService(repository: BooksRepository, definition: BookServerDefinition = booksServerDefinition) {
    const { identity, service: servicePolicy } = definition;
    const editPayloadSchema = createMediaEditPayloadSchema(identity.mediaType, servicePolicy.editableFields);
    const service = createMediaService(repository, definition, {
        [UpdateType.PAGE]: updatePageHandler,
        [UpdateType.REDO]: updateRedoHandler,
        [UpdateType.STATUS]: updateStatusHandler,
    });

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

        const authorsData = authors === undefined
            ? undefined
            : uniqueBy(authors
                .split(",")
                .map((name) => name.trim())
                .filter(Boolean).map((name) => ({ name })), (author) => author.name
            );

        withTransaction(() => repository.updateMediaWithDetails({ mediaData, authorsData }));
    }

    async function updateDefaultCover(mediaId: number, payload: { imageUrl?: string; imageFile?: File }) {
        const { coverDirectory } = identity;

        const media = repository.findById(mediaId);
        if (!media) throw notFound();

        const currentCover = media.imageCover.split("/").pop();
        if (currentCover !== "default.jpg") {
            throw new FormattedError("Cover already set for this book.");
        }

        let imageName;
        if (payload.imageFile) {
            imageName = await saveUploadedImage({ file: payload.imageFile, dirSaveName: coverDirectory });
        }
        else if (payload.imageUrl) {
            imageName = await saveImageFromUrl({ imageUrl: payload.imageUrl, dirSaveName: coverDirectory });
        }

        if (!imageName || imageName === "default.jpg") {
            throw new FormattedError("Could not update the book cover. Please choose another one.");
        }

        withTransaction(() => repository.updateMediaWithDetails({ mediaData: { apiId: media.apiId, imageCover: imageName } }));
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

    function getAvailableGenres() {
        return [
            "Action & Adventure", "Biography", "Chick lit", "Children", "Classic", "Crime", "Drama",
            "Dystopian", "Essay", "Fantastic", "Fantasy", "Historical Fiction", "History", "Humor", "Horror",
            "Literary Novel", "Memoirs", "Mystery", "Paranormal", "Philosophy", "Poetry", "Romance", "Science",
            "Science-Fiction", "Short story", "Suspense", "Testimony", "Thriller", "Western", "Young adult"
        ];
    }

    function updateRedoHandler(currentState: BooksList, payload: RedoPayload, media: Book): [BooksList, LogPayload] {
        const newState = { ...currentState, redo: payload.redo };
        const logPayload = { oldValue: currentState.redo, newValue: payload.redo };

        newState.total = media.pages + (payload.redo * media.pages);

        return [newState, logPayload];
    }

    function updateStatusHandler(currentState: BooksList, payload: StatusPayload, media: Book): [BooksList, LogPayload] {
        const newState = { ...currentState, status: payload.status };
        const logPayload = { oldValue: currentState.status, newValue: payload.status };

        if (payload.status === Status.COMPLETED) {
            newState.total = media.pages;
            newState.actualPage = media.pages;
        }
        else if (payload.status === Status.PLAN_TO_READ) {
            newState.redo = 0;
            newState.total = 0;
            newState.actualPage = 0;
        }

        return [newState, logPayload];
    }

    function updatePageHandler(currentState: BooksList, payload: PagePayload, media: Book): [BooksList, LogPayload] {
        if (payload.actualPage > media.pages) {
            throw new FormattedError("Invalid page");
        }

        const newState = { ...currentState, actualPage: payload.actualPage };
        const logPayload = { oldValue: currentState.actualPage, newValue: payload.actualPage };

        newState.total = payload.actualPage + (currentState.redo * media.pages);

        return [newState, logPayload];
    }

    return {
        ...service,
        getMediaEditableFields,
        updateMediaEditableFields,
        updateDefaultCover,
        batchBooksWithoutGenres,
        addGenresToBook,
        getAvailableGenres,
        updateRedoHandler,
        updateStatusHandler,
        updatePageHandler,
    };
}


export type BooksService = ReturnType<typeof createBooksService>;
