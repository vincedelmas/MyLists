import {CoverType} from "@/lib/types/media-common.types";
import {MediaType} from "@/lib/utils/enums";
import {FormattedError} from "@/lib/utils/error-classes";
import {saveImageFromUrl, saveUploadedImage} from "@/lib/utils/image-saver";
import {UpdateUserCustomCover} from "@/lib/contracts/media/library";


export const prepareLibraryCustomCover = async (kind: MediaType, input: UpdateUserCustomCover) => {
    if (input.remove) return null;

    const dirSaveName: CoverType = `${kind}-covers`;
    const customCover = input.imageFile
        ? await saveUploadedImage({ dirSaveName, file: input.imageFile })
        : await saveImageFromUrl({ dirSaveName, imageUrl: input.imageUrl });

    if (!customCover || customCover === "default.jpg") {
        throw new FormattedError("Could not update the custom cover. Please choose another one.");
    }
    return customCover;
};
