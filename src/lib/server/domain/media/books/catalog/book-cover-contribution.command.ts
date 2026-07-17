import {notFound} from "@tanstack/react-router";
import {getImageFilename} from "@/lib/utils/image-url";
import {FormattedError} from "@/lib/utils/error-classes";
import {saveImageFromUrl, saveUploadedImage} from "@/lib/utils/image-saver";
import {BookCatalogAdminRepository} from "@/lib/server/domain/media/books/catalog/book-catalog-admin.repository";


export class BookCoverContributionCommand {
    constructor(private readonly repository: BookCatalogAdminRepository) {
    }

    async contribute(catalogItemId: number, payload: { imageUrl?: string; imageFile?: File }) {
        const current = await this.repository.getCoverContributionState(catalogItemId);
        if (!current) throw notFound();
        if (getImageFilename(current.imageCover) !== "default.jpg") {
            throw new FormattedError("Cover already set for this book.");
        }

        const imageName = payload.imageFile
            ? await saveUploadedImage({ file: payload.imageFile, dirSaveName: "books-covers" })
            : payload.imageUrl
                ? await saveImageFromUrl({ imageUrl: payload.imageUrl, dirSaveName: "books-covers" })
                : undefined;
        if (!imageName || getImageFilename(imageName) === "default.jpg") {
            throw new FormattedError("Could not update the book cover. Please choose another one.");
        }

        if (!await this.repository.replaceDefaultCover(catalogItemId, imageName)) {
            throw new FormattedError("Cover already set for this book.");
        }
    }
}
