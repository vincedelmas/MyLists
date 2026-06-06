import {MediaType} from "@/lib/utils/enums";
import {MediaDetails} from "@/lib/types/query.options.types";
import {MediaComponent} from "@/lib/client/components/media/base/MediaComponent";
import {BookCoverEditDialog} from "@/lib/client/components/media/base/BookCoverEditDialog";


interface MediaHeroProps {
    external: boolean;
    media: MediaDetails;
    mediaType: MediaType;
}


export function MediaHero({ media, mediaType, external }: MediaHeroProps) {
    const backdropStyle = {
        filter: "blur(20px)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundImage: `linear-gradient(to bottom, rgba(15, 15, 15, 0.7), rgba(15, 15, 15, 1)), url(${media.imageCover})`,
    };

    return (
        <div className="relative flex items-end overflow-hidden min-h-[50vh] left-1/2 right-1/2 ml-[-50vw] mr-[-50vw] w-screen">
            <div style={backdropStyle} className="absolute inset-0 z-0"/>
            <div className="relative max-w-7xl mx-auto w-full px-8 max-sm:px-2">
                <div className="
                    flex flex-row items-end gap-10 container mx-auto px-4 pb-12
                    max-lg:flex-col max-lg:items-start pt-15
                    max-sm:items-center
                ">
                    <div className="relative lg:w-60 w-52 shrink-0 overflow-hidden rounded-lg shadow-2xl border">
                        <img
                            alt={media.name}
                            src={media.imageCover}
                            className="w-full h-full object-cover"
                        />
                        {mediaType === MediaType.BOOKS && media.imageCover.endsWith("default.jpg") &&
                            <BookCoverEditDialog
                                mediaId={media.id}
                                apiId={media.apiId}
                                external={external}
                                mediaName={media.name}
                            />
                        }
                    </div>
                    <div className="flex-1 w-full space-y-4">
                        <div className="flex flex-wrap gap-2 mb-2">
                            <MediaComponent
                                media={media}
                                name="overTitle"
                                mediaType={mediaType}
                            />
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-primary drop-shadow-lg">
                            {media.name}
                        </h1>
                        {"originalName" in media && media.originalName && media.originalName !== media.name &&
                            <div className="text-sm italic text-muted-foreground">
                                <span className="font-medium">{media.originalName}</span>
                            </div>
                        }
                        <div className="flex items-center flex-wrap gap-y-2 gap-x-6 text-sm text-primary font-medium">
                            <MediaComponent
                                media={media}
                                name="underTitle"
                                mediaType={mediaType}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
