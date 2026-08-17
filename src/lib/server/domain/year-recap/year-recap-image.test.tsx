import {describe, expect, it, vi} from "vitest";
import {renderSvg} from "takumi-js";
import {MediaType} from "@/lib/utils/enums";
import type {YearRecap} from "@/lib/types/year-recap.types";
import {renderYearRecapImage, yearRecapImageRenderer} from "@/lib/server/domain/year-recap/year-recap-image";


const createRecap = (): YearRecap => {
    const months = Array.from({ length: 12 }, (_, index) => ({
        month: `2026-${String(index + 1).padStart(2, "0")}`,
        hours: index + 1,
        repeats: 0,
        completions: index % 3 === 0 ? 1 : 0,
        titleCount: index + 1,
    }));

    return {
        year: 2026,
        scope: "all",
        availableMediaTypes: [MediaType.MOVIES],
        totals: {
            hours: 78,
            repeats: 2,
            completions: 4,
            titleCount: 12,
            activeMonths: 12,
            longestActiveStreak: 12,
        },
        months,
        media: [{
            mediaType: MediaType.MOVIES,
            hours: 78,
            share: 100,
            repeats: 2,
            completions: 4,
            titleCount: 12,
            activeMonths: 12,
            progress: 12,
            progressUnit: "viewings",
        }],
        topTitles: [{
            mediaId: 1,
            mediaType: MediaType.MOVIES,
            name: "Interstellar",
            imageCover: "missing.jpg",
            releaseDate: "2014-11-07",
            rating: 9.5,
            favorite: true,
            hours: 12,
            repeats: 1,
            completions: 1,
            activeMonths: 2,
            progress: 1,
            progressUnit: "viewings",
        }],
        mostRepeatedTitle: null,
        busiestMonth: months[11],
        comparison: null,
        user: { name: "recap-user", ratingSystem: "score" },
    };
};


describe("renderYearRecapImage", () => {
    it("renders the social recap as a 1080 by 1350 PNG", async () => {
        const rendered = await renderYearRecapImage(createRecap());

        const png = Buffer.from(rendered.dataUrl.split(",")[1], "base64");
        const metadata = await new Bun.Image(png).metadata();

        expect(rendered.filename).toBe("recap-user-2026-all-media-recap.png");
        expect(metadata).toMatchObject({ width: 1080, height: 1350, format: "png" });
    });

    it("renders non-Latin titles and emoji in usernames", async () => {
        const renderer = await yearRecapImageRenderer;
        const textSvg = await renderSvg(
            <div style={{ fontFamily: "Open Sans, Noto Sans JP, Noto Emoji", fontSize: 32 }}>
                Привет · שלום · 進撃の巨人 🌴
            </div>,
            { width: 300, height: 80, renderer, emoji: "from-font" },
        );

        expect(textSvg.match(/<use /g)?.length).toBeGreaterThanOrEqual(18);

        const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected image fetch"));
        const recap = createRecap();
        recap.user.name = "recap-user 🌴";
        recap.topTitles[0].name = "Бегущий по лезвию";

        try {
            const rendered = await renderYearRecapImage(recap);
            const png = Buffer.from(rendered.dataUrl.split(",")[1], "base64");

            await expect(new Bun.Image(png).metadata()).resolves.toMatchObject({
                width: 1080,
                height: 1350,
                format: "png",
            });
            expect(fetchSpy).not.toHaveBeenCalled();
        }
        finally {
            fetchSpy.mockRestore();
        }
    });

    it("embeds a resolved custom cover", async () => {
        await yearRecapImageRenderer;

        const originalFile = Bun.file;
        const coverBytes = Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
            "base64",
        );
        const readCover = vi.fn(async () => coverBytes.buffer);

        Bun.file = ((input, options) => {
            if (String(input).endsWith("movies-covers/custom-cover.png")) {
                return {
                    type: "image/png",
                    exists: async () => true,
                    arrayBuffer: readCover,
                } as unknown as ReturnType<typeof Bun.file>;
            }

            return Reflect.apply(originalFile, Bun, [input, options]) as ReturnType<typeof Bun.file>;
        }) as typeof Bun.file;

        const recap = createRecap();
        recap.topTitles[0].imageCover = "custom-cover.png";

        try {
            const rendered = await renderYearRecapImage(recap);
            const png = Buffer.from(rendered.dataUrl.split(",")[1], "base64");

            await expect(new Bun.Image(png).metadata()).resolves.toMatchObject({
                width: 1080,
                height: 1350,
                format: "png",
            });
            expect(readCover).toHaveBeenCalledOnce();
        }
        finally {
            Bun.file = originalFile;
        }
    });
});
