import path from "path";
import crypto from "crypto";
import {mkdir} from "fs/promises";
import {serverEnv} from "@/env/server";
import {CoverType} from "@/lib/types/media-common.types";
import {FormattedError} from "@/lib/utils/error-classes";


type ResizeOptions = { width?: number; height: number };


interface SaveImageFromUrlOptions {
    defaultName?: string;
    dirSaveName: CoverType;
    resize?: ResizeOptions;
    imageUrl: string | undefined;
}


export const saveImageFromUrl = async ({ imageUrl, dirSaveName, resize, defaultName = "default.jpg" }: SaveImageFromUrlOptions) => {
    if (!resize) {
        resize = { width: 300, height: 450 };
    }

    try {
        const response = await fetch(imageUrl!, { signal: AbortSignal.timeout(3000) });
        if (!response.ok) {
            return defaultName;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        return processAndSaveImage({ buffer, dirSaveName, resize });
    }
    catch {
        return defaultName;
    }
};


interface SaveUploadedImageOptions {
    file: File;
    resize?: ResizeOptions;
    dirSaveName: CoverType;
}


export const saveUploadedImage = async ({ file, dirSaveName, resize }: SaveUploadedImageOptions) => {
    if (!resize) {
        resize = { width: 300, height: 450 };
    }

    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        return processAndSaveImage({ buffer, dirSaveName, resize });
    }
    catch {
        throw new FormattedError("This image could not be processed");
    }
};


interface ProcessAndSaveImageOptions {
    buffer: Buffer;
    resize: ResizeOptions;
    dirSaveName: CoverType;
}


const processAndSaveImage = async ({ buffer, dirSaveName, resize }: ProcessAndSaveImageOptions) => {
    const randomHex = crypto.randomBytes(16).toString("hex");
    const fileName = `${randomHex}.jpg`;

    const base = serverEnv.BASE_UPLOADS_LOCATION;
    const saveLocation = path.isAbsolute(base)
        ? path.join(base, dirSaveName)
        : path.join(process.cwd(), base, dirSaveName);

    await mkdir(saveLocation, { recursive: true });
    const filePath = path.join(saveLocation, fileName);

    try {
        const image = new Bun.Image(buffer);

        let width = resize.width;
        if (!width) {
            const metadata = await image.metadata();
            width = Math.max(1, Math.round((metadata.width / metadata.height) * resize.height));
        }

        image.resize(width, resize.height);
        await image.jpeg({ quality: 90 }).write(filePath);
    }
    catch {
        throw new FormattedError("This image could not be processed");
    }

    return fileName;
};
