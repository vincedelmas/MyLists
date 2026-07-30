import {Badge} from "@/lib/client/components/ui/badge";
import {MediaDetails} from "@/lib/types/query.options.types";
import {MediaSectionTitle} from "@/lib/client/components/media/base/MediaDetailsComps";


interface MediaSynopsisProps {
    media: MediaDetails;
}


export const MediaSynopsis = ({ media }: MediaSynopsisProps) => {
    return (
        <div className="space-y-4">
            <section>
                <MediaSectionTitle title="Synopsis"/>
                <p className="text-primary leading-relaxed text-base">
                    {media.synopsis}
                </p>
                {("tagline" in media && media.tagline) &&
                    <blockquote className="text-muted-foreground mt-2 italic">
                        — {media.tagline}
                    </blockquote>
                }
            </section>

            <section className="flex flex-wrap gap-2">
                {media.genres.map((genre) =>
                    <Badge key={genre.id} variant="black">
                        {genre.name}
                    </Badge>
                )}
            </section>
        </div>
    );
};
