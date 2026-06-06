export const saveAsFile = (data: BlobPart, filename: string, mimeType: string) => {
    if (typeof window === "undefined") return;

    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};


export const convertToCsv = (items: Record<string, any>[]) => {
    if (!items?.length) return "";

    const headers = Object.keys(items[0]);

    const rows = items.map((item) =>
        headers.map((header) => {
            const cell = item[header] ?? "";
            const stringified = String(cell).replace(/"/g, '""');

            return /[",\n\r]/.test(stringified) ? `"${stringified}"` : stringified;
        }).join(","),
    );

    return [headers.join(","), ...rows].join("\r\n");
};
