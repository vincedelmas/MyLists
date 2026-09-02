import {useState} from "react";
import {toast} from "@/lib/client/components/ui/toast";
import {YearRecap} from "@/lib/types/year-recap.types";
import {Download, ImageDown, Share2} from "lucide-react";
import {Button} from "@/lib/client/components/ui/button";
import {postGenerateYearRecapImage} from "@/lib/server/functions/year-recap";
import {
    canShareYearRecapImage,
    downloadYearRecapImage,
    GeneratedYearRecapImage,
    shareYearRecapImage,
} from "@/lib/utils/year-recap-image";


interface YearRecapShareCardProps {
    color: string;
    recap: YearRecap;
}


export function YearRecapShareCard({ recap, color }: YearRecapShareCardProps) {
    const [generating, setGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<GeneratedYearRecapImage | null>(null);
    const canShareImage = generatedImage !== null && canShareYearRecapImage();

    const generate = async () => {
        setGenerating(true);
        try {
            setGeneratedImage(await postGenerateYearRecapImage({
                data: {
                    year: recap.year,
                    mediaType: recap.scope === "all" ? undefined : recap.scope,
                },
            }));
        }
        catch (error) {
            toast.add({
                type: "error",
                priority: "high",
                title: error instanceof Error ? error.message : "Could not generate the recap image.",
            });
        }
        finally {
            setGenerating(false);
        }
    };

    return (
        <div className="grid gap-7 lg:grid-cols-[minmax(0,0.65fr)_minmax(300px,0.35fr)] lg:items-start">
            <div className="overflow-hidden rounded-lg">
                {generatedImage ?
                    <img
                        className="h-auto w-full"
                        src={generatedImage.dataUrl}
                        alt={`${recap.year} recap social card`}
                    />
                    :
                    <div className="grid min-h-96 place-items-center p-8 text-center">
                        <div>
                            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-muted" style={{ color }}>
                                <ImageDown className="size-6"/>
                            </div>
                            <div className="mt-4 font-bold">
                                No image generated yet
                            </div>
                            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                                Generation reloads the latest visible MyActivity data and creates a private downloadable image.
                            </p>
                        </div>
                    </div>
                }
            </div>

            <div className="lg:sticky lg:top-24">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Social image
                </div>
                <h3 className="mt-2 text-2xl font-black">
                    Generate your recap
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    This creates a fresh 1080 × 1350 image using your current recap data and top covers.
                    It is only available to the profile owner.
                </p>
                <Button className="mt-5" size="lg" onClick={generate} disabled={generating}>
                    <ImageDown data-icon="inline-start"/>
                    {generating ? "Generating…" : generatedImage ? "Regenerate image" : "Generate image"}
                </Button>

                {generatedImage &&
                    <div className="mt-3">
                        <div className="flex flex-wrap gap-2">
                            {canShareImage &&
                                <Button
                                    variant="outline"
                                    onClick={async () => {
                                        const result = await shareYearRecapImage(generatedImage);
                                        if (result === "failed") {
                                            toast.add({
                                                type: "error",
                                                title: "The image could not be shared.",
                                            });
                                        }
                                    }}
                                >
                                    <Share2 data-icon="inline-start"/> Share
                                </Button>
                            }
                            <Button variant="outline" onClick={() => downloadYearRecapImage(generatedImage)}>
                                <Download data-icon="inline-start"/> Download
                            </Button>
                        </div>
                        {!canShareImage &&
                            <p className="mt-2 text-xs leading-5 text-muted-foreground">
                                Direct image sharing requires HTTPS and a browser that supports file sharing.
                            </p>
                        }
                    </div>
                }
            </div>
        </div>
    );
}
