import {notFound} from "@tanstack/react-router";
import {Status, UpdateType} from "@/lib/utils/enums";
import {FormattedError} from "@/lib/utils/error-classes";
import {LogPayload} from "@/lib/types/user-updates.types";
import {BaseService} from "@/lib/server/domain/media/base/base.service";
import {Book, BooksList} from "@/lib/server/domain/media/books/books.types";
import {saveImageFromUrl, saveUploadedImage} from "@/lib/utils/image-saver";
import {BooksRepository} from "@/lib/server/domain/media/books/books.repository";
import {PagePayload, RedoPayload, StatusPayload} from "@/lib/types/user-media.types";
import {BookServerDefinition, booksServerDefinition} from "@/lib/media-definitions/books/book.definition.server";


export class BooksService extends BaseService<BookServerDefinition, BooksRepository> {
    constructor(repository: BooksRepository, definition: BookServerDefinition = booksServerDefinition) {
        super(repository, definition);

        this.updateHandlers = {
            ...this.updateHandlers,
            [UpdateType.PAGE]: this.updatePageHandler.bind(this),
            [UpdateType.REDO]: this.updateRedoHandler.bind(this),
            [UpdateType.STATUS]: this.updateStatusHandler.bind(this),
        }
    }

    async getMediaEditableFields(mediaId: number) {
        const editableFields = this.servicePolicy.editableFields;

        const fields: Record<string, any> = {};
        const media = await this.repository.findAllAssociatedDetails(mediaId);
        if (!media) throw notFound();

        editableFields.forEach((field) => {
            if (field in media) {
                fields[field] = media[field as keyof typeof media];
            }
        });

        if (media.authors) {
            fields.authors = media.authors.map(author => author.name).join(",");
        }

        return { fields };
    }

    async updateMediaEditableFields(mediaId: number, payload: Record<string, any>) {
        const { editableFields } = this.servicePolicy;
        const { coverDirectory } = this.identity;

        const media = await this.repository.findById(mediaId);
        if (!media) throw notFound();

        const fields = {} as Record<Partial<keyof Book>, any>;
        fields.apiId = media.apiId;

        if (payload?.imageCover) {
            const imageName = await saveImageFromUrl({
                dirSaveName: coverDirectory,
                imageUrl: payload.imageCover,
            });
            fields.imageCover = imageName;
            delete payload.imageCover;
        }

        let authorsData: { name: string }[] | undefined;

        if (payload?.authors !== undefined) {
            authorsData = payload.authors
                .split(",")
                .map((author: string) => author.trim())
                .filter(Boolean)
                .map((name: string) => ({ name }));
            delete payload.authors;
        }

        for (const key in payload) {
            if (Object.prototype.hasOwnProperty.call(payload, key) && editableFields.includes(key as keyof Book)) {
                fields[key as keyof typeof media] = payload[key as keyof typeof media];
            }
        }

        await this.repository.updateMediaWithDetails({ mediaData: fields, authorsData });
    }

    async updateDefaultCover(mediaId: number, payload: { imageUrl?: string; imageFile?: File }) {
        const { coverDirectory } = this.identity;

        const media = await this.repository.findById(mediaId);
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

        await this.repository.updateMediaWithDetails({ mediaData: { apiId: media.apiId, imageCover: imageName } });
    }

    async batchBooksWithoutGenres(batchSize: number) {
        const booksWithoutGenres = await this.repository.getBooksWithoutGenres();

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

    async addGenresToBook(bookApiId: string, booksGenres: string[]) {
        const mediaData = { apiId: bookApiId };
        const genresData = booksGenres.map((g) => ({ name: g }));
        await this.repository.updateMediaWithDetails({ mediaData, genresData });
    }

    getAvailableGenres() {
        return [
            "Action & Adventure", "Biography", "Chick lit", "Children", "Classic", "Crime", "Drama",
            "Dystopian", "Essay", "Fantastic", "Fantasy", "Historical Fiction", "History", "Humor", "Horror",
            "Literary Novel", "Memoirs", "Mystery", "Paranormal", "Philosophy", "Poetry", "Romance", "Science",
            "Science-Fiction", "Short story", "Suspense", "Testimony", "Thriller", "Western", "Young adult"
        ];
    }

    updateRedoHandler(currentState: BooksList, payload: RedoPayload, media: Book): [BooksList, LogPayload] {
        const newState = { ...currentState, redo: payload.redo };
        const logPayload = { oldValue: currentState.redo, newValue: payload.redo };

        newState.total = media.pages + (payload.redo * media.pages);

        return [newState, logPayload];
    }

    updateStatusHandler(currentState: BooksList, payload: StatusPayload, media: Book): [BooksList, LogPayload] {
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

    updatePageHandler(currentState: BooksList, payload: PagePayload, media: Book): [BooksList, LogPayload] {
        if (payload.actualPage > media.pages) {
            throw new FormattedError("Invalid page");
        }

        const newState = { ...currentState, actualPage: payload.actualPage };
        const logPayload = { oldValue: currentState.actualPage, newValue: payload.actualPage };

        newState.total = payload.actualPage + (currentState.redo * media.pages);

        return [newState, logPayload];
    }
}
