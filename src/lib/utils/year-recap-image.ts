export type GeneratedYearRecapImage = {
    filename: string;
    dataUrl: string;
};


const getImageFile = async ({ dataUrl, filename }: GeneratedYearRecapImage) => {
    const blob = await fetch(dataUrl).then((response) => response.blob());
    return new File([blob], filename, { type: "image/png" });
};


export const downloadYearRecapImage = ({ dataUrl, filename }: GeneratedYearRecapImage) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    link.click();
};


export const canShareYearRecapImage = () => {
    if (typeof window === "undefined" || !window.isSecureContext || !navigator.share || !navigator.canShare) return false;

    return navigator.canShare({
        files: [new File([new Uint8Array()], "mylists-recap.png", { type: "image/png" })],
    });
};


export const shareYearRecapImage = async (image: GeneratedYearRecapImage) => {
    if (!canShareYearRecapImage()) return "unsupported" as const;
    const file = await getImageFile(image);

    try {
        await navigator.share({ files: [file], title: "MyLists year recap" });
        return "shared" as const;
    }
    catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return "cancelled" as const;
        return "failed" as const;
    }
};
