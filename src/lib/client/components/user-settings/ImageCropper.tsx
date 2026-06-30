import React, {useState} from "react";
import Cropper, {Area} from "react-easy-crop";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {FieldDescription} from "@/lib/client/components/ui/field";


interface ImageCropperProps {
    aspect?: number;
    fileName: string;
    sliceHeight?: number;
    resultClassName?: string;
    cropShape: "round" | "rect";
    onCropApplied: (file: File) => void;
}


interface CropState {
    zoom: number;
    open: boolean;
    imageSrc: string;
    showResult: boolean;
    imageWidth: number | null;
    croppedImage: Blob | null;
    imageHeight: number | null;
    crop: { x: number; y: number };
    croppedAreaPixels: Area | null;
}


export const ImageCropper = ({ aspect, fileName, sliceHeight, cropShape, onCropApplied, resultClassName = "" }: ImageCropperProps) => {
    const [state, setState] = useState<CropState>({
        zoom: 1,
        open: true,
        imageSrc: "",
        imageWidth: null,
        imageHeight: null,
        showResult: false,
        croppedImage: null,
        crop: { x: 0, y: 0 },
        croppedAreaPixels: null,
    });

    const computedAspect = (sliceHeight && state.imageWidth) ? state.imageWidth / sliceHeight : aspect ?? 1;

    const createImage = (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const image = new window.Image();
            image.addEventListener("load", () => resolve(image));
            image.addEventListener("error", reject);
            image.src = url;
        });
    };

    const getCroppedImg = async (imageSrc: string, crop: Area) => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            throw new Error("Could not get canvas context");
        }

        // Slice mode output full width and fixed height
        if (sliceHeight) {
            canvas.height = sliceHeight;
            canvas.width = image.naturalWidth;

            ctx.drawImage(image, 0, crop.y, image.naturalWidth, crop.height, 0, 0, image.naturalWidth, sliceHeight);
        }
        else {
            // Normal crop mode (profile picture)
            canvas.width = crop.width;
            canvas.height = crop.height;

            ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
        }

        return new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                }
                else {
                    reject(new Error("Canvas is empty"));
                }
            }, "image/jpeg");
        });
    };

    const onFileChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
        const file = ev.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                const img = new window.Image();
                img.onload = () => {
                    setState((prev) => ({
                        ...prev,
                        open: true,
                        showResult: false,
                        imageWidth: img.naturalWidth,
                        imageHeight: img.naturalHeight,
                        imageSrc: reader.result as string,
                    }));
                };
                img.src = reader.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const onCropComplete = (_: Area, croppedAreaPixels: Area) => {
        setState((prev) => ({ ...prev, croppedAreaPixels }));
    };

    const handleApplyCrop = async (ev: React.MouseEvent<HTMLButtonElement>) => {
        ev.preventDefault();
        if (!state.croppedAreaPixels) return;

        const croppedImage = await getCroppedImg(state.imageSrc, state.croppedAreaPixels);
        const croppedFile = new File([croppedImage], `${fileName}.jpg`, { type: "image/jpeg" });

        onCropApplied(croppedFile);
        setState((prev) => ({ ...prev, open: false, croppedImage, showResult: true }));
    };

    const handleEditCrop = () => {
        setState((prev) => ({ ...prev, open: true, showResult: false }));
    };

    return (
        <div>
            <Input
                type="file"
                accept="image/*"
                onChange={onFileChange}
                id={`${fileName}-input`}
                className="file:text-muted-foreground cursor-pointer"
            />
            <FieldDescription>
                Choose an image to crop and resize.
            </FieldDescription>
            {(state.imageSrc && state.open) &&
                <div className="space-y-4 mt-6 bg-popover rounded-lg p-3">
                    <div>
                        <h4 className="font-medium">
                            Crop Your Image
                        </h4>
                        <div className="text-sm text-muted-foreground">
                            Crop the image to your liking.
                        </div>
                    </div>
                    <div className="relative h-60 w-full">
                        <Cropper
                            minZoom={1}
                            crop={state.crop}
                            cropShape={cropShape}
                            image={state.imageSrc}
                            aspect={computedAspect}
                            showGrid={!sliceHeight}
                            maxZoom={sliceHeight ? 1 : 3}
                            onCropComplete={onCropComplete}
                            zoom={sliceHeight ? 1 : state.zoom}
                            onCropChange={(crop) => setState((prev) => ({ ...prev, crop }))}
                            onZoomChange={(zoom) =>
                                !sliceHeight && setState((prev) => ({ ...prev, zoom }))
                            }
                        />
                    </div>
                    <Button type="button" onClick={handleApplyCrop}>
                        Apply Crop
                    </Button>
                </div>
            }
            {(state.showResult && state.croppedImage) &&
                <div className="space-y-4 mt-4 bg-popover rounded-lg p-3">
                    <h4 className="font-medium">
                        Selected Image
                    </h4>
                    <img
                        alt={fileName}
                        className={resultClassName}
                        src={URL.createObjectURL(state.croppedImage)}
                    />
                    <Button type="button" onClick={handleEditCrop}>
                        Edit Crop
                    </Button>
                </div>
            }
        </div>
    );
};
