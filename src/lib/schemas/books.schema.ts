import * as z from "zod";
import {PROGRESS_MAX} from "@/lib/utils/constants";
import {booksDefinition} from "@/lib/media-definitions/books/books.definition";
import {coercedPositiveIntFieldSchema, imageUrlSchema} from "@/lib/schemas/common.schema";
import {blankMetadataFieldSchema, metadataDateSchema, metadataIntegerSchema} from "@/lib/media-definitions/base/media-metadata";


export type CreateBookInput = z.input<typeof createBookSchema>;
export type CreateBookPayload = z.output<typeof createBookSchema>;
export type UpdateUserBookDetailsInput = z.input<typeof updateUserBookDetailsSchema>;
export type UpdateUserBookDetailsPayload = z.output<typeof updateUserBookDetailsSchema>;


const bookFields = booksDefinition.metadataSchema.pick({
    name: true, authors: true, pages: true, language: true, publishers: true,
    releaseDate: true, synopsis: true, imageCover: true,
});


const requiredTextSchema = z.string().trim().min(1, "This field is required.");
const optionalEditionTextSchema = z.union([z.string().trim().min(1).max(255), blankMetadataFieldSchema])
    .nullable().optional().transform(v => v ?? null);


export const createBookSchema = bookFields.required().extend({
    language: bookFields.shape.language.pipe(requiredTextSchema),
    synopsis: bookFields.shape.synopsis.pipe(requiredTextSchema),
    releaseDate: bookFields.shape.releaseDate.pipe(z.iso.date()),
    imageCover: bookFields.shape.imageCover.pipe(imageUrlSchema),
    publishers: bookFields.shape.publishers.pipe(requiredTextSchema),
    pages: bookFields.shape.pages.unwrap().pipe(z.number().int().positive("Enter the number of pages.")),
    genres: z.array(z.enum(booksDefinition.genres)).min(1, "Select at least one genre.").max(booksDefinition.maxGenres),
    authors: bookFields.shape.authors.unwrap().trim()
        .refine(value => value.split(",").some(name => name.trim()), "Add at least one author."),
});


export const updateUserBookDetailsSchema = z.object({
    mediaId: coercedPositiveIntFieldSchema,
    customLanguage: optionalEditionTextSchema,
    customPublisher: optionalEditionTextSchema,
    customReleaseDate: metadataDateSchema.transform(v => v ?? null),
    customTitle: z.string().trim()
        .min(1, "Title is required.")
        .max(300, "Title cannot exceed 300 characters."),
    customPages: metadataIntegerSchema.pipe(
        z.number().int("Enter a whole number of pages.")
            .min(0, "Pages cannot be negative.")
            .max(PROGRESS_MAX, `Pages cannot exceed ${PROGRESS_MAX}.`),
    ),
});
