import {useId, useState} from "react";
import {Link} from "@tanstack/react-router";
import {zodResolver} from "@hookform/resolvers/zod";
import {capitalize} from "@/lib/utils/formatting/text";
import {handleServerFormErrors} from "@/lib/client/forms";
import {BookOpen, ExternalLink, RefreshCw} from "lucide-react";
import {Separator} from "@/lib/client/components/ui/separator";
import {FormProvider, useForm, useWatch} from "react-hook-form";
import {FormError} from "@/lib/client/components/forms/FormError";
import type {AdminMissingCoverMedia} from "@/lib/types/admin.types";
import {Button, buttonVariants} from "@/lib/client/components/ui/button";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {FieldGroup, FieldLegend, FieldSet} from "@/lib/client/components/ui/field";
import {CoverSourceFields} from "@/lib/client/components/media/base/CoverSourceFields";
import {GoogleCoverSearch} from "@/lib/client/components/media/base/GoogleCoverSearch";
import {SuggestedBookCover} from "@/lib/client/components/media/base/SuggestedBookCover";
import {useRefreshMediaMutation} from "@/lib/client/react-query/query-mutations/media.mutations";
import {adminUpdateMediaCoverSchema, type AdminUpdateMediaCoverInput} from "@/lib/schemas/admin.schema";
import {useAdminUpdateMediaCoverMutation} from "@/lib/client/react-query/query-mutations/admin.mutations";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


interface MissingCoverEditorProps {
    media: AdminMissingCoverMedia;
    onUpdated: () => void;
}


export function MissingCoverEditor({ media, onUpdated }: MissingCoverEditorProps) {
    const suggestionsId = useId();
    const [mode, setMode] = useState<"link" | "upload">("link");
    const [showOpenLibrary, setShowOpenLibrary] = useState(false);
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
    const imageUrl = useWatch({ control: form.control, name: "imageUrl" });

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

                {media.authors &&
                    <p className="text-sm text-muted-foreground">
                        {media.authors}
                    </p>
                }

                <CardDescription>
                    {capitalize(media.mediaType)} · {media.releaseDate?.slice(0, 4) ?? "Release date unknown"} · #{media.mediaId}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
                <FieldSet className="gap-3">
                    <FieldLegend variant="label">Find a cover</FieldLegend>
                    <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-2">
                        <LoadingButton
                            size="lg"
                            variant="outline"
                            disabled={isPending}
                            className="justify-start"
                            isLoading={refreshMutation.isPending}
                            icon={<RefreshCw data-icon="inline-start"/>}
                            onClick={() => refreshMutation.mutate({ data: { mediaType: media.mediaType, mediaId: media.mediaId } })}
                        >
                            Refresh metadata
                        </LoadingButton>
                        <Link
                            target="_blank"
                            rel="noreferrer"
                            to="/details/$mediaType/$mediaId"
                            params={{ mediaType: media.mediaType, mediaId: media.mediaId }}
                            className={buttonVariants({ variant: "outline", size: "lg", className: "justify-start" })}
                        >
                            <ExternalLink data-icon="inline-start" aria-hidden="true"/>
                            View media
                        </Link>
                        <GoogleCoverSearch
                            size="lg"
                            mediaId={media.mediaId}
                            mediaType={media.mediaType}
                            mediaName={media.name}
                            authors={media.authors}
                            disabled={isPending}
                            onUseCover={url => {
                                form.clearErrors(["imageFile", "imageUrl"]);
                                form.setValue("imageFile", undefined);
                                form.setValue("imageUrl", url, { shouldDirty: true, shouldValidate: true });
                                setMode("link");
                            }}
                        />

                        {media.mediaType === "books" &&
                            <Button
                                size="lg"
                                type="button"
                                disabled={isPending}
                                className="justify-start"
                                aria-controls={suggestionsId}
                                aria-expanded={showOpenLibrary}
                                variant={showOpenLibrary ? "secondary" : "outline"}
                                onClick={() => setShowOpenLibrary(!showOpenLibrary)}
                            >
                                <BookOpen data-icon="inline-start"/>
                                Search Open Library
                            </Button>
                        }
                    </div>

                    {refreshMutation.isSuccess &&
                        <p role="status" className="text-sm text-muted-foreground">
                            No cover was returned by the provider. Choose another source or add an image.
                        </p>
                    }

                    {media.mediaType === "books" && showOpenLibrary &&
                        <div id={suggestionsId} className="rounded-lg border bg-muted/30 p-4">
                            <SuggestedBookCover
                                disabled={isPending}
                                open={showOpenLibrary}
                                mediaName={media.name}
                                onUseCover={url => {
                                    form.clearErrors(["imageFile", "imageUrl"]);
                                    form.setValue("imageFile", undefined);
                                    form.setValue("imageUrl", url, { shouldDirty: true, shouldValidate: true });
                                    setMode("link");
                                    setShowOpenLibrary(false);
                                }}
                            />
                        </div>
                    }
                </FieldSet>
                <Separator/>
                <FormProvider {...form}>
                    <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
                        <FieldSet disabled={isPending}>
                            <FieldLegend variant="label">Cover image</FieldLegend>
                            <FieldGroup>
                                <CoverSourceFields
                                    mode={mode}
                                    disabled={isPending}
                                    onModeChange={setMode}
                                />
                                {mode === "link" && imageUrl && /^https?:\/\//i.test(imageUrl) &&
                                    <img
                                        src={imageUrl}
                                        referrerPolicy="no-referrer"
                                        alt={`Cover preview for ${media.name}`}
                                        className="max-h-64 max-w-full self-start rounded-md object-contain"
                                    />
                                }
                            </FieldGroup>
                        </FieldSet>
                        <FormError/>
                        <FormSubmitButton disabled={isPending} isLoading={mutation.isPending}>
                            Save cover & continue
                        </FormSubmitButton>
                    </form>
                </FormProvider>
            </CardContent>
        </Card>
    );
}
