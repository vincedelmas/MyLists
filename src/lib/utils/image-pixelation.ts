import path from "path";
import fs from "fs/promises";
import {clientEnv} from "@/env/client";
import {serverEnv} from "@/env/server";
import {createServerOnlyFn} from "@tanstack/react-start";


export const pixelateImage = createServerOnlyFn(() => async (url: string, level: number) => {
    // Derive disk path from URL
    const uploadsBasePath = `${clientEnv.VITE_BASE_URL}/${serverEnv.UPLOADS_DIR_NAME}/`;
    const relativeImagePath = url.substring(uploadsBasePath.length);
    const absPath = path.join(serverEnv.BASE_UPLOADS_LOCATION, relativeImagePath);

    // Scale lookup (1 = heavy pix, 5 = light pix)
    const scaleFactors: Record<number, number> = { 5: 6, 4: 7, 3: 8, 2: 10, 1: 12 };
    const factor = scaleFactors[level];

    let inputBuffer;
    try {
        inputBuffer = await fs.readFile(absPath);
    }
    catch {
        return "";
    }

    const sharp = (await import("sharp")).default;
    const meta = await sharp(inputBuffer).metadata();
    const w = meta.width!;
    const h = meta.height!;

    const tinyW = Math.max(1, Math.floor(w / factor));
    const tinyH = Math.max(1, Math.floor(h / factor));

    const smallBuffer = await sharp(inputBuffer)
        .resize(tinyW, tinyH, { kernel: sharp.kernel.nearest })
        .png()
        .toBuffer();

    const pixelatedBuffer = await sharp(smallBuffer)
        .resize(w, h, { kernel: sharp.kernel.nearest })
        .png()
        .toBuffer();

    return pixelatedBuffer.toString("base64");
})();
