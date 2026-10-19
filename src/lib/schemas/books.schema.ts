import * as z from "zod";
import {MediaType} from "@/lib/utils/enums";
import {imageUrlSchema} from "@/lib/schemas/common.schema";
import {booksDefinition} from "@/lib/media-definitions/books/books.definition";
import {editMediaDetailsPayloadSchemas} from "@/lib/schemas/media-details.schema";


export type CreateBookInput = z.input<typeof createBookSchema>;
export type CreateBookPayload = z.output<typeof createBookSchema>;


const bookFields = editMediaDetailsPayloadSchemas[MediaType.BOOKS].pick({
    name: true, authors: true, pages: true, language: true, publishers: true,
    releaseDate: true, synopsis: true, imageCover: true,
});


const requiredTextSchema = z.string().trim().min(1, "This field is required.");


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
