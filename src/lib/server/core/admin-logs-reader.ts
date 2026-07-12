import path from "node:path";
import {serverEnv} from "@/env/server";
import "@tanstack/react-start/server-only";
import {readdir, readFile, stat} from "node:fs/promises";


const MAX_LISTED_FILES = 100;


const getLogConfig = () => {
    return {
        filePrefix: serverEnv.ADMIN_LOG_PREFIX,
        maxFileBytes: serverEnv.ADMIN_LOG_MAX_BYTES,
        directory: path.resolve(serverEnv.ADMIN_LOG_DIR),
    };
};


const parseLogLine = (rawLine: string, lineNumber: number) => {
    try {
        return { lineNumber, kind: "json", record: JSON.parse(rawLine) };
    }
    catch {
        // PM2/system output or an incomplete final line can be plain text
    }
    return { lineNumber, kind: "text", text: rawLine };
};


export const listAdminLogFiles = async () => {
    const config = getLogConfig();

    let entries;

    try {
        entries = await readdir(config.directory, { withFileTypes: true });
    }
    catch (error) {
        // The directory might not exist in local dev
        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
            return [];
        }

        throw error;
    }

    const candidates = entries.filter((entry) => {
        return (entry.isFile() && entry.name.startsWith(config.filePrefix) && !entry.name.endsWith(".gz"));
    });

    const files = await Promise.all(candidates.map(async (entry) => {
        const filePath = path.join(config.directory, entry.name);

        try {
            const metadata = await stat(filePath);
            return {
                fileName: entry.name,
                sizeBytes: metadata.size,
                modifiedAt: metadata.mtime.toISOString(),
                canRead: metadata.size <= config.maxFileBytes,
            };
        }
        catch (error) {
            // File may have been rotated between readdir() and stat()
            if (error instanceof Error && "code" in error && error.code === "ENOENT") {
                return null;
            }

            throw error;
        }
    }));

    return files
        .filter((file) => file !== null)
        .sort((a, b) => Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt))
        .slice(0, MAX_LISTED_FILES);
};


export const readAdminLogFile = async (fileName: string) => {
    const config = getLogConfig();
    const availableFiles = await listAdminLogFiles();

    const selectedFile = availableFiles.find((file) => file.fileName === fileName);
    if (!selectedFile) {
        throw new Error("Log file not found");
    }
    if (!selectedFile.canRead) {
        throw new Error(`Log file exceeds the ${Math.ceil(config.maxFileBytes / (1024 * 1024))}MB dashboard limit`);
    }

    const filePath = path.join(config.directory, selectedFile.fileName);

    const buffer = await readFile(filePath);
    if (buffer.byteLength > config.maxFileBytes) {
        // Active file may have grown since stat() called
        throw new Error(`Log file exceeds the ${Math.ceil(config.maxFileBytes / (1024 * 1024))} dashboard limit`);
    }

    const text = buffer.toString("utf8");

    const lines = text
        .split(/\r?\n/)
        .flatMap((rawLine, index) => {
            if (rawLine.length === 0) return [];
            return [parseLogLine(rawLine, index + 1)];
        });

    return {
        lines,
        file: {
            ...selectedFile,
            sizeBytes: buffer.byteLength,
        },
    };
};
