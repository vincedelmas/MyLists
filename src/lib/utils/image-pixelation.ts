import path from "path";
import {clientEnv} from "@/env/client";
import {serverEnv} from "@/env/server";


export const pixelateImage = async (url: string, level: number) => {
    // Derive disk path from URL
    const relativeImagePath = url.substring(`${clientEnv.VITE_BASE_URL}/${serverEnv.UPLOADS_DIR_NAME}/`.length);
    const absPath = path.join(serverEnv.BASE_UPLOADS_LOCATION, relativeImagePath);

    // Scale lookup (1 = heavy pix, 5 = light pix)
    const factor = { 5: 6, 4: 7, 3: 8, 2: 10, 1: 12 }[level] ?? 12;

    let image, metadata;
    try {
        image = new Bun.Image(absPath);
        metadata = await image.metadata();
    }
    catch {
        const defaultImagePath = path.join(serverEnv.BASE_UPLOADS_LOCATION, path.dirname(relativeImagePath), "default.jpg");
        image = new Bun.Image(defaultImagePath);
        metadata = await image.metadata();
    }

    const tinyW = Math.max(1, Math.floor(metadata.width / factor));
    const tinyH = Math.max(1, Math.floor(metadata.height / factor));

    const smallBuffer = await image
        .resize(tinyW, tinyH, { filter: "nearest" })
        .png()
        .buffer();

    return new Bun.Image(smallBuffer)
        .resize(metadata.width, metadata.height, { filter: "nearest" })
        .png()
        .toBase64();
};
