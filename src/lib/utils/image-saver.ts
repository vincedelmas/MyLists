import path from "path";
import crypto from "crypto";
import {mkdir} from "fs/promises";
import {serverEnv} from "@/env/server";
import {CoverType} from "@/lib/types/media-common.types";
import {FormattedError} from "@/lib/utils/error-classes";
import {createServerOnlyFn} from "@tanstack/react-start";


interface ResizeOptions {
    width?: number;
    height?: number;
}


interface ProcessAndSaveImageOptions {
    buffer: Buffer;
    dirSaveName: CoverType;
    resize?: ResizeOptions;
}


interface SaveImageFromUrlOptions {
    defaultName?: string;
    dirSaveName: CoverType;
    resize?: ResizeOptions;
    imageUrl: string | undefined;
}


interface SaveUploadedImageOptions {
    file: File;
    resize?: ResizeOptions;
    dirSaveName: CoverType;
}


export const saveImageFromUrl = createServerOnlyFn(() => async ({ imageUrl, dirSaveName, resize, defaultName = "default.jpg" }: SaveImageFromUrlOptions) => {
    if (!resize) {
        resize = { width: 300, height: 450 };
    }

    try {
        const response = await fetch(imageUrl!, { signal: AbortSignal.timeout(3000) });
        if (!response.ok) {
            return defaultName;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        return processAndSaveImage({ buffer, dirSaveName, resize });
    }
    catch {
        return defaultName;
    }
})();


export const saveUploadedImage = createServerOnlyFn(() => async ({ file, dirSaveName, resize }: SaveUploadedImageOptions) => {
    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        return processAndSaveImage({ buffer, dirSaveName, resize });
    }
    catch {
        throw new FormattedError("This image could not be processed");
    }
})();


const processAndSaveImage = createServerOnlyFn(() => async ({ buffer, dirSaveName, resize }: ProcessAndSaveImageOptions) => {
    const randomHex = crypto.randomBytes(16).toString("hex");
    const fileName = `${randomHex}.jpg`;

    const base = serverEnv.BASE_UPLOADS_LOCATION;
    const saveLocation = path.isAbsolute(base)
        ? path.join(base, dirSaveName)
        : path.join(process.cwd(), base, dirSaveName);

    await mkdir(saveLocation, { recursive: true });
    const filePath = path.join(saveLocation, fileName);

    try {
        const sharp = (await import("sharp")).default;
        const sharpInstance = sharp(buffer);
        if (resize) {
            sharpInstance.resize(resize.width ?? null, resize.height);
        }
        await sharpInstance.jpeg({ quality: 90 }).toFile(filePath);
    }
    catch {
        throw new FormattedError("This image could not be processed");
    }

    return fileName;
})();
