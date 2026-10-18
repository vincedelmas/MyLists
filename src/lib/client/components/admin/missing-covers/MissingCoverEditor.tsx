import {useState} from "react";
import {Link} from "@tanstack/react-router";
import {zodResolver} from "@hookform/resolvers/zod";
import {ExternalLink, RefreshCw} from "lucide-react";
import {FormProvider, useForm} from "react-hook-form";
import {capitalize} from "@/lib/utils/formatting/text";
import {handleServerFormErrors} from "@/lib/client/forms";
import {FormError} from "@/lib/client/components/forms/FormError";
import type {AdminMissingCoverMedia} from "@/lib/types/admin.types";
import {FieldGroup, FieldSet} from "@/lib/client/components/ui/field";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {CoverSourceFields} from "@/lib/client/components/media/base/CoverSourceFields";
import {useRefreshMediaMutation} from "@/lib/client/react-query/query-mutations/media.mutations";
import {adminUpdateMediaCoverSchema, type AdminUpdateMediaCoverInput} from "@/lib/schemas/admin.schema";
import {useAdminUpdateMediaCoverMutation} from "@/lib/client/react-query/query-mutations/admin.mutations";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


interface MissingCoverEditorProps {
    media: AdminMissingCoverMedia;
    onUpdated: () => void;
}


export function MissingCoverEditor({ media, onUpdated }: MissingCoverEditorProps) {
    const [mode, setMode] = useState<"link" | "upload">("link");
    const refreshMutation = useRefreshMediaMutation(media.mediaType, media.mediaId, onUpdated);
    const mutation = useAdminUpdateMediaCoverMutation(media.mediaType, media.mediaId, onUpdated);
    const form = useForm<AdminUpdateMediaCoverInput>({
        resolver: zodResolver(adminUpdateMediaCoverSchema),
        defaultValues: {
            mediaId: media.mediaId,
            mediaType: media.mediaType,
        },
    });

    const isPending = mutation.isPending || refreshMutation.isPending;

    const onSubmit = (data: AdminUpdateMediaCoverInput) => {
        const formData = new FormData();
        formData.append("mediaType", data.mediaType);
        formData.append("mediaId", String(data.mediaId));

        if (data.imageUrl) formData.append("imageUrl", data.imageUrl);
        if (data.imageFile) formData.append("imageFile", data.imageFile);

        mutation.mutate({ data: formData }, {
            onError: error => handleServerFormErrors(form, error),
        });
    }

    return (
        <Card className="min-w-0" role="region" aria-label="Cover editor">
            <CardHeader>
                <CardTitle className="wrap-anywhere">
                    <h2>
                        {media.name}
                    </h2>
                </CardTitle>
                <CardDescription>
                    {capitalize(media.mediaType)} · {media.releaseDate?.slice(0, 4) ?? "Release date unknown"} · #{media.mediaId}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-4">
                    <LoadingButton
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        isLoading={refreshMutation.isPending}
                        icon={<RefreshCw data-icon="inline-start"/>}
                        onClick={() => refreshMutation.mutate({
                            data: { mediaType: media.mediaType, mediaId: media.mediaId },
                        })}
                    >
                        Refresh metadata
                    </LoadingButton>
                    <Link
                        target="_blank"
                        rel="noreferrer"
                        to="/details/$mediaType/$mediaId"
                        className="inline-flex items-center gap-1.5 text-sm underline underline-offset-4"
                        params={{ mediaType: media.mediaType, mediaId: media.mediaId }}
                    >
                        View media
                        <ExternalLink className="size-3.5" aria-hidden="true"/>
                    </Link>
                </div>
                <p className="text-sm text-muted-foreground">
                    Try refreshing the media to fetch its cover, or add an image below.
                </p>
                {refreshMutation.isSuccess &&
                    <p role="status" className="text-sm text-muted-foreground">
                        No cover was returned by the provider. Add an image below.
                    </p>
                }
                <FormProvider {...form}>
                    <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
                        <FieldSet disabled={isPending}>
                            <FieldGroup>
                                <CoverSourceFields
                                    mode={mode}
                                    disabled={isPending}
                                    onModeChange={setMode}
                                />
                            </FieldGroup>
                        </FieldSet>
                        <FormError/>
                        <FormSubmitButton
                            disabled={isPending}
                            isLoading={mutation.isPending}
                        >
                            Save cover & continue
                        </FormSubmitButton>
                    </form>
                </FormProvider>
            </CardContent>
        </Card>
    );
}
