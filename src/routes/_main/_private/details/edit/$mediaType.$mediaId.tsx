import {useId} from "react";
import {cn} from "@/lib/utils/classnames";
import {zodResolver} from "@hookform/resolvers/zod";
import {toast} from "@/lib/client/components/ui/toast";
import {Input} from "@/lib/client/components/ui/input";
import {capitalize} from "@/lib/utils/text-formatting";
import {useSuspenseQuery} from "@tanstack/react-query";
import {THEME_ICONS_MAP} from "@/lib/utils/theme-utils";
import {Button} from "@/lib/client/components/ui/button";
import {ArrowLeft, PencilLine, Save} from "lucide-react";
import {Textarea} from "@/lib/client/components/ui/textarea";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";
import {FormError} from "@/lib/client/components/forms/FormError";
import {createFileRoute, useRouter} from "@tanstack/react-router";
import {Controller, FormProvider, useForm} from "react-hook-form";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {editMediaDetailsOptions} from "@/lib/client/react-query/query-options";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {useEditMediaMutation} from "@/lib/client/react-query/query-mutations/media.mutations";
import {Field, FieldDescription, FieldError, FieldLabel, FieldSet} from "@/lib/client/components/ui/field";
import {EditMediaDetailsPayload, editMediaDetailsPayloadSchema, mediaTypeMediaIdSchema} from "@/lib/schemas";


export const Route = createFileRoute("/_main/_private/details/edit/$mediaType/$mediaId")({
    params: {
        parse: (params) => {
            const result = mediaTypeMediaIdSchema.safeParse(params);
            return result.success ? result.data : false;
        },
    },
    context: ({ params: { mediaType, mediaId } }) => ({
        editMediaDetailsQueryOptions: editMediaDetailsOptions(mediaType, mediaId),
    }),
    loader: ({ context }) => {
        return context.queryClient.ensureQueryData(context.editMediaDetailsQueryOptions);
    },
    component: MediaEditPage,
});


function MediaEditPage() {
    const fieldId = useId();
    const { history } = useRouter();
    const { mediaType, mediaId } = Route.useParams();
    const { editMediaDetailsQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(editMediaDetailsQueryOptions).data;
    const editMediaMutation = useEditMediaMutation({ noErrorToast: true });

    const form = useForm<EditMediaDetailsPayload>({
        resolver: zodResolver(editMediaDetailsPayloadSchema),
        defaultValues: {
            imageCover: undefined,
            name: apiData.fields?.name,
            pages: apiData.fields?.pages,
            budget: apiData.fields?.budget,
            revenue: apiData.fields?.revenue,
            tagline: apiData.fields?.tagline,
            authors: apiData.fields?.authors,
            synopsis: apiData.fields?.synopsis,
            duration: apiData.fields?.duration,
            homepage: apiData.fields?.homepage,
            chapters: apiData.fields?.chapters,
            language: apiData.fields?.language,
            createdBy: apiData.fields?.createdBy,
            gameModes: apiData.fields?.gameModes,
            publishers: apiData.fields?.publishers,
            lockStatus: apiData.fields?.lockStatus,
            gameEngine: apiData.fields?.gameEngine,
            releaseDate: apiData.fields?.releaseDate,
            lastAirDate: apiData.fields?.lastAirDate,
            hltbMainTime: apiData.fields?.hltbMainTime,
            originalName: apiData.fields?.originalName,
            directorName: apiData.fields?.directorName,
            originCountry: apiData.fields?.originCountry,
            originalLanguage: apiData.fields?.originalLanguage,
            playerPerspective: apiData.fields?.playerPerspective,
            hltbMainAndExtraTime: apiData.fields?.hltbMainAndExtraTime,
            hltbTotalCompleteTime: apiData.fields?.hltbTotalCompleteTime,
        }
    });
    const MediaIcon = THEME_ICONS_MAP[mediaType];
    const mediaName = apiData.fields?.name ?? capitalize(mediaType);

    const onSubmit = (submittedData: EditMediaDetailsPayload) => {
        const payload = { ...submittedData };

        if (payload?.lockStatus === "false") {
            payload.lockStatus = false;
        }
        else if (payload?.lockStatus === "true") {
            payload.lockStatus = true;
        }

        editMediaMutation.mutate({ data: { mediaType, mediaId, payload } }, {
            onError: (error) => {
                handleServerFormErrors(form, error);
            },
            onSuccess: async () => {
                history.go(-1);
                toast.add({ title: "Media successfully updated!", type: "success" });
            },
        });
    };

    const renderField = (fieldEntry: [string, any]) => {
        const [key, _] = fieldEntry;

        return (
            <Controller
                key={key}
                name={key}
                control={form.control}
                render={({ field, fieldState }) => (
                    <Field
                        data-invalid={fieldState.invalid}
                        data-disabled={editMediaMutation.isPending}
                        className={cn(key === "synopsis" && "md:col-span-2")}
                    >
                        <FieldLabel htmlFor={`${fieldId}-${key}`}>{capitalize(key.replaceAll("_", " "))}</FieldLabel>
                        {key === "synopsis"
                            ? <Textarea {...field} id={`${fieldId}-${key}`} className="min-h-48" aria-invalid={fieldState.invalid}/>
                            : <Input {...field} id={`${fieldId}-${key}`} aria-invalid={fieldState.invalid}/>
                        }
                        <FieldError errors={[fieldState.error]}/>
                    </Field>
                )}
            />
        );
    };

    return (
        <PageTitle title={`Edit ${mediaName}`} onlyHelmet>
            <div className="mb-8 flex flex-col pt-8">
                <PageHeader
                    asideIcon={MediaIcon}
                    eyebrowIcon={PencilLine}
                    asideLabel="You’re editing"
                    title={`Edit ${mediaName}`}
                    eyebrow="Media details"
                    description="Change the information shown for this title on MyLists."
                    asideValue={
                        <div className="flex items-baseline gap-2">
                            <span className="capitalize">
                                {mediaType}
                            </span>
                            <span className="font-mono text-sm text-muted-foreground">
                                #{mediaId}
                            </span>
                        </div>
                    }
                />

                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-5 pt-8">
                        <FieldSet disabled={editMediaMutation.isPending}>
                            <section className="grid grid-cols-[minmax(12rem,0.35fr)_minmax(0,1fr)] gap-10 rounded-xl border p-5 shadow-xs max-lg:grid-cols-1 max-lg:gap-5 sm:p-6">
                                <div>
                                    <div className="font-mono text-xs font-semibold text-brand">01</div>
                                    <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                                        Cover source
                                    </h2>
                                    <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">
                                        Replace the current artwork with an image from a public URL.
                                    </p>
                                </div>

                                <Controller
                                    name="imageCover"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field
                                            data-invalid={fieldState.invalid}
                                            data-disabled={editMediaMutation.isPending}
                                            className="max-w-2xl"
                                        >
                                            <FieldLabel htmlFor={`${fieldId}-image-cover`}>Image Cover URL</FieldLabel>
                                            <Input {...field} id={`${fieldId}-image-cover`} aria-invalid={fieldState.invalid}/>
                                            <FieldDescription>
                                                Leave this empty to keep the current cover.
                                            </FieldDescription>
                                            <FieldError errors={[fieldState.error]}/>
                                        </Field>
                                    )}
                                />
                            </section>

                            <section className="mt-5 grid grid-cols-[minmax(12rem,0.35fr)_minmax(0,1fr)] gap-10 rounded-xl border p-5 shadow-xs max-lg:grid-cols-1 max-lg:gap-5 sm:p-6">
                                <div>
                                    <div className="font-mono text-xs font-semibold text-brand">02</div>
                                    <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                                        Media information
                                    </h2>
                                    <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">
                                        Review the title, release data, credits, and type-specific details.
                                    </p>
                                </div>

                                <div className="grid min-w-0 grid-cols-2 gap-x-5 gap-y-5 max-md:grid-cols-1">
                                    {Object.entries(apiData.fields).map(renderField)}
                                </div>
                            </section>
                        </FieldSet>

                        <FormError/>

                        <div className="flex items-center justify-between gap-4 py-5 max-sm:flex-col-reverse max-sm:items-stretch">
                            <Button type="button" variant="ghost" onClick={() => history.go(-1)}>
                                <ArrowLeft data-icon="inline-start"/>
                                Cancel
                            </Button>
                            <FormSubmitButton isLoading={editMediaMutation.isPending}>
                                <Save data-icon="inline-start"/>
                                Save changes
                            </FormSubmitButton>
                        </div>
                    </form>
                </FormProvider>
            </div>
        </PageTitle>
    );
}
