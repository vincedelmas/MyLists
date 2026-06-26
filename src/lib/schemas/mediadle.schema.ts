import * as z from "zod";


export const mediadleSuggestionsSchema = z.object({
    query: z.string().trim().min(1),
});

export const addMediadleGuessSchema = z.object({
    guess: z.string().trim().min(1),
});
