import {CoverType} from "@/lib/types/media-common.types";
import {MediaType} from "@/lib/utils/enums";
import {FormattedError} from "@/lib/utils/error-classes";
import {saveImageFromUrl, saveUploadedImage} from "@/lib/utils/image-saver";
import {UpdateUserCustomCover} from "@/lib/contracts/media/library";


type CustomCoverReader = {
    findUserMedia(userId: number, catalogItemId: number): Promise<unknown>;
};


type CustomCoverWriter = {
    updateCustomCover(params: { userId: number; catalogItemId: number; customCover: string | null }): Promise<unknown> | unknown;
};


export class LibraryCustomCoverCommand {
    constructor(
        private readonly kind: MediaType,
        private readonly reader: CustomCoverReader,
        private readonly writer: CustomCoverWriter,
    ) {}

    async update(userId: number, input: UpdateUserCustomCover) {
        if (!await this.reader.findUserMedia(userId, input.mediaId)) {
            throw new FormattedError("Media not in your list");
        }

        const customCover = await this.prepare(input);
        await this.writer.updateCustomCover({ userId, catalogItemId: input.mediaId, customCover });

        const result = await this.reader.findUserMedia(userId, input.mediaId);
        if (!result) throw new FormattedError("Media not in your list");
        return result;
    }

    private async prepare(input: UpdateUserCustomCover) {
        if (input.remove) return null;

        const dirSaveName: CoverType = `${this.kind}-covers`;
        const customCover = input.imageFile
            ? await saveUploadedImage({ dirSaveName, file: input.imageFile })
            : await saveImageFromUrl({ dirSaveName, imageUrl: input.imageUrl });

        if (!customCover || customCover === "default.jpg") {
            throw new FormattedError("Could not update the custom cover. Please choose another one.");
        }
        return customCover;
    }
}
