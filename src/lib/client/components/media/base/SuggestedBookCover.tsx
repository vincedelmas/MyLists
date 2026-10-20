import {useQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {suggestBookCoverOptions} from "@/lib/client/react-query/query-options";


interface SuggestedBookCoverProps {
    open: boolean;
    mediaName: string;
    disabled?: boolean;
    onUseCover: (coverUrl: string) => void;
}


export const SuggestedBookCover = ({ open, mediaName, onUseCover, disabled = false }: SuggestedBookCoverProps) => {
    const suggestedCoverUrl = `https://covers.openlibrary.org/b/title/${encodeURIComponent(mediaName.trim())}-L.jpg?default=false`;
    const { data, isLoading, isError } = useQuery(suggestBookCoverOptions(mediaName, suggestedCoverUrl, open));

    return (
        <>
            <div className="flex flex-col gap-3">
                <div className="text-sm font-medium">
                    Open Library suggestion
                </div>
                {data === "available" &&
                    <div className="flex flex-wrap items-center gap-4">
                        <img
                            src={suggestedCoverUrl}
                            alt={`Open Library cover for ${mediaName}`}
                            className="h-32 max-w-full rounded-md border object-contain"
                        />
                        <Button type="button" variant="outline" disabled={disabled} onClick={() => onUseCover(suggestedCoverUrl)}>
                            Use suggested cover
                        </Button>
                    </div>
                }
            </div>

            {isLoading &&
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Spinner aria-hidden="true"/>
                    Looking for a suggested cover...
                </div>
            }

            {(data === "missing" || isError) &&
                <div className="text-sm text-muted-foreground">
                    No suggestion found.
                </div>
            }
        </>
    );
};
