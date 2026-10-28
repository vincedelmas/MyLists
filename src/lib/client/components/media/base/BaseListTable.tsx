import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {ColumnDef} from "@tanstack/react-table";
import {CircleCheck, Settings2} from "lucide-react";
import {Button} from "@/lib/client/components/ui/button";
import {UserMediaItem} from "@/lib/types/query.options.types";
import {QuickAddMedia} from "@/lib/client/components/media/base/QuickAddMedia";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {mediaTableFeatures} from "@/lib/client/components/media/media-table-features";


export type ColumnConfigProps = {
    isCurrent: boolean;
    isConnected: boolean;
    mediaType: MediaType;
    isMediaTypeActive: boolean;
    onAdded?: () => Promise<void>;
    onEdit: (mediaId: number) => void;
}


export const getBaseColumns = <T extends UserMediaItem>(props: ColumnConfigProps): ColumnDef<typeof mediaTableFeatures, T>[] => {
    const { isCurrent, isConnected, isMediaTypeActive, mediaType, onEdit, onAdded } = props;

    return [
        {
            id: "name",
            header: "Name",
            cell: ({ row: { original } }) => (
                <Link to="/details/$mediaType/$mediaId" params={{ mediaType, mediaId: original.mediaId }}>
                    <div className="flex items-center gap-3">
                        {original.mediaName}
                        {!isCurrent && isMediaTypeActive && original.common &&
                            <CircleCheck className="size-4 text-success"/>
                        }
                    </div>
                </Link>
            ),
        },
        {
            accessorKey: "status",
            header: "Status",
        },
        {
            id: "actions",
            cell: ({ row: { original } }) => {
                if (!isConnected) return null;
                if (isCurrent) {
                    return (
                        <Button
                            size="bare"
                            type="button"
                            variant="ghost"
                            onClick={() => onEdit(original.mediaId)}
                            aria-label={`Edit ${original.mediaName}`}
                            className="flex w-full items-center justify-center"
                        >
                            <Settings2 className="size-4 opacity-70"/>
                        </Button>
                    );
                }
                if (!isMediaTypeActive || !original.common) {
                    return (
                        <div className="flex items-center justify-center">
                            <QuickAddMedia
                                onAdded={onAdded}
                                mediaType={mediaType}
                                mediaId={original.mediaId}
                                isMediaTypeActive={isMediaTypeActive}
                                allStatuses={getMediaDefinition(mediaType).statuses}
                            />
                        </div>
                    );
                }
                return null;
            },
        },
    ];
}
