import * as z from "zod";
import { getContainer } from "@/lib/server/core/container";
import { MediaType } from "@/lib/utils/enums";
import { MediadleRepository } from "@/lib/server/domain/mediadle/mediadle.repository";
import { FormattedError } from "@/lib/utils/error-classes";
import { addMediadleGuessSchema } from "@/lib/schemas/mediadle.schema";
import { mobileImagePath } from "./images";

export const moviedleGuessSchema = z.intersection(
    z.object({ mediadleId: z.number().int().positive() }),
    z.discriminatedUnion("action", [
        addMediadleGuessSchema.extend({ action: z.literal("guess") }),
        z.object({ action: z.literal("skip") }),
    ]),
);

export async function getMobileMoviedle(userId: number) {
    const { services, registries } = await getContainer();
    const movies = registries.mediaService.get(MediaType.MOVIES);
    const data = await services.mediadle.getDailyMediadleData(movies, userId);
    const now = new Date();
    return {
        ...data,
        resetsAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString(),
        result: data.result
            ? {
                  mediaId: data.result.mediaId,
                  name: movies.findById(data.result.mediaId)!.name,
                  cover: mobileImagePath(data.result.nonPixelatedCover),
              }
            : null,
    };
}

export async function guessMobileMoviedle(userId: number, input: z.infer<typeof moviedleGuessSchema>) {
    const { services, registries } = await getContainer();
    const movies = registries.mediaService.get(MediaType.MOVIES);
    const current = MediadleRepository.getTodayMoviedle();
    if (current?.id !== input.mediadleId)
        throw new FormattedError("A new puzzle is available. Try again with today's cover.");
    return services.mediadle.addMediadleGuess(userId, input.action === "skip" ? "rtehsqqt" : input.guess, movies);
}

export async function getMobileMoviedleSuggestions(query: string) {
    const { registries } = await getContainer();
    return registries.mediaService.get(MediaType.MOVIES).searchMediadleSuggestion(query);
}

export async function getMobileMoviedleLeaderboard(userId: number) {
    const { services } = await getContainer();
    const data = services.mediadle.getLeaderboard(userId);
    return {
        entries: data.entries.map((item) => ({ ...item, image: item.image ? mobileImagePath(item.image) : null })),
        currentUserEntry: data.currentUserEntry
            ? {
                  ...data.currentUserEntry,
                  image: data.currentUserEntry.image ? mobileImagePath(data.currentUserEntry.image) : null,
              }
            : null,
    };
}
