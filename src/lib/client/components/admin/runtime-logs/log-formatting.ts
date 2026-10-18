export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "text";

type RawLogLine = {
    kind: string;
    text?: string;
    lineNumber: number;
    record?: Record<string, unknown>;
};

export type PrettyLogEntry = {
    time?: string;
    level: LogLevel;
    message: string;
    details?: string;
    lineNumber: number;
};


const commonPinoKeys = new Set(["level", "time", "pid", "hostname", "name", "msg", "message", "v"]);


const pinoLevels: Record<number, LogLevel> = {
    10: "trace",
    20: "debug",
    30: "info",
    40: "warn",
    50: "error",
    60: "fatal",
};


export const logLevels: LogLevel[] = ["fatal", "error", "warn", "info", "debug", "trace", "text"];


export const levelTextClasses: Record<LogLevel, string> = {
    debug: "text-info",
    warn: "text-warning",
    info: "text-success",
    error: "text-destructive",
    fatal: "text-destructive",
    text: "text-muted-foreground",
    trace: "text-muted-foreground",
};


export function formatLogLines(lines: RawLogLine[]) {
    return lines.map((line): PrettyLogEntry => {
        if (line.kind === "text") {
            return {
                level: "text",
                message: line.text ?? "",
                lineNumber: line.lineNumber,
            };
        }

        const record = line.record;
        if (record === null || typeof record !== "object" || Array.isArray(record)) {
            return {
                level: "text",
                lineNumber: line.lineNumber,
                message: JSON.stringify(record),
            };
        }

        const time = formatLogTime(record.time);
        const details = formatLogDetails(record);
        const level = checkLogLevel(record.level);
        const message = String(record.msg ?? record.message ?? "(no message)");

        return {
            time,
            level,
            message,
            details,
            lineNumber: line.lineNumber,
        };
    });
}


function checkLogLevel(level: unknown): LogLevel {
    if (typeof level === "number") return pinoLevels[level] ?? "text";
    if (typeof level !== "string") return "text";

    const newLevel = level.toLowerCase();
    if (logLevels.some(level => level === newLevel)) {
        return newLevel as LogLevel;
    }

    return "text";
}


function formatLogTime(time: unknown) {
    if (typeof time !== "string" && typeof time !== "number") return undefined;

    const date = new Date(time);
    if (Number.isNaN(date.getTime())) return String(time);

    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    const milliseconds = String(date.getMilliseconds()).padStart(3, "0");

    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}


function formatLogDetails(record: Record<string, unknown>) {
    const details = Object.entries(record).filter(([key]) => !commonPinoKeys.has(key));
    if (details.length === 0) return undefined;

    return details.map(([key, value]) => formatDetail(key, value)).join("\n");
}


function formatDetail(key: string, value: unknown) {
    const formattedValue = formatDetailValue(key, value);
    const [firstLine, ...restLines] = formattedValue.split("\n");

    if (restLines.length === 0) {
        return `    ${key}: ${firstLine}`;
    }

    return [
        `    ${key}: ${firstLine}`,
        ...restLines.map((line) => `        ${line}`),
    ].join("\n");
}


function formatDetailValue(key: string, value: unknown) {
    if (key === "err" && value && typeof value === "object" && "stack" in value && typeof value.stack === "string") {
        return value.stack;
    }

    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (value === null) return "null";
    if (value === undefined) return "undefined";

    try {
        return JSON.stringify(value, null, 2);
    }
    catch {
        return String(value);
    }
}
