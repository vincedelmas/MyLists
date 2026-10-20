import {useId} from "react";
import type {ZodType} from "zod";
import {cn} from "@/lib/utils/classnames";
import {THEME_ICONS_MAP} from "@/lib/client/theme";
import {zodResolver} from "@hookform/resolvers/zod";
import {toast} from "@/lib/client/components/ui/toast";
import {Input} from "@/lib/client/components/ui/input";
import {capitalize} from "@/lib/utils/formatting/text";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {ArrowLeft, PencilLine, Save} from "lucide-react";
import {handleServerFormErrors} from "@/lib/client/forms";
import {Textarea} from "@/lib/client/components/ui/textarea";
import {FormError} from "@/lib/client/components/forms/FormError";
import {createFileRoute, useRouter} from "@tanstack/react-router";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {editMediaDetailsOptions} from "@/lib/client/react-query/query-options";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {createMediaEditPayloadSchema} from "@/lib/schemas/media-details.schema";
import {Controller, type FieldPath, FormProvider, useForm} from "react-hook-form";
import {GoogleCoverSearch} from "@/lib/client/components/media/base/GoogleCoverSearch";
import {useEditMediaMutation} from "@/lib/client/react-query/query-mutations/media.mutations";
import {Field, FieldDescription, FieldError, FieldLabel, FieldSet} from "@/lib/client/components/ui/field";
import {EditMediaDetailsInput, EditMediaDetailsPayload, editMediaDetailsSchema, mediaTypeMediaIdSchema} from "@/lib/schemas";


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
        return context.queryClient.query({ ...context.editMediaDetailsQueryOptions, staleTime: "static" });
    },
    component: MediaEditPage,
    head: ({ loaderData, params: { mediaType } }) => ({
        meta: loaderData ? [{ title: `Edit ${loaderData.fields?.name ?? capitalize(mediaType)} - MyLists` }] : [],
    }),
});


function MediaEditPage() {
    const fieldId = useId();
    const { history } = useRouter();
    const { mediaType, mediaId } = Route.useParams();
    const { editMediaDetailsQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(editMediaDetailsQueryOptions).data;
    const editMediaMutation = useEditMediaMutation({ noErrorToast: true });

    const payloadSchema: ZodType<EditMediaDetailsPayload, EditMediaDetailsInput> = createMediaEditPayloadSchema(mediaType, apiData.editableFields);
    const form = useForm<EditMediaDetailsInput, unknown, EditMediaDetailsPayload>({
        resolver: zodResolver(payloadSchema),
        defaultValues: {
            ...apiData.fields,
        },
    });

    const MediaIcon = THEME_ICONS_MAP[mediaType];
    const mediaName = apiData.fields?.name ?? capitalize(mediaType);

    const onSubmit = (submittedData: EditMediaDetailsPayload) => {
        const data = editMediaDetailsSchema.parse({ mediaType, mediaId, payload: submittedData });

        editMediaMutation.mutate({ data }, {
            onError: (error) => {
                handleServerFormErrors(form, error);
            },
            onSuccess: async () => {
                history.go(-1);
                toast.add({ title: "Media successfully updated!", type: "success" });
            },
        });
    };

    const renderField = (key: string) => {
        return (
            <Controller
                key={key}
                control={form.control}
                name={key as FieldPath<EditMediaDetailsInput>}
                render={({ field, fieldState }) => (
                    <Field
                        data-invalid={fieldState.invalid}
                        data-disabled={editMediaMutation.isPending}
                        className={cn(key === "synopsis" && "md:col-span-2")}
                    >
                        <FieldLabel htmlFor={`${fieldId}-${key}`}>
                            {capitalize(key.replaceAll("_", " "))}
                        </FieldLabel>

                        {key === "synopsis" ?
                            <Textarea
                                {...field}
                                className="min-h-48"
                                id={`${fieldId}-${key}`}
                                aria-invalid={fieldState.invalid}
                                value={field.value == null ? "" : String(field.value)}
                            />
                            :
                            <Input
                                {...field}
                                id={`${fieldId}-${key}`}
                                aria-invalid={fieldState.invalid}
                                value={field.value == null ? "" : String(field.value)}
                            />
                        }

                        <FieldError errors={[fieldState.error]}/>
                    </Field>
                )}
            />
        );
    };

    return (
        <div className="mb-8 flex flex-col pt-8">
            <PageHeader
                asideIcon={MediaIcon}
                eyebrow="Media details"
                eyebrowIcon={PencilLine}
                asideLabel="You’re editing"
                title={`Edit ${mediaName}`}
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
                        <section className="grid grid-cols-[minmax(12rem,0.35fr)_minmax(0,1fr)] gap-10 rounded-xl border p-5
                        shadow-xs max-lg:grid-cols-1 max-lg:gap-5 sm:p-6">
                            <div>
                                <div className="text-xs font-semibold text-brand">
                                    01
                                </div>
                                <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                                    Cover source
                                </h2>
                                <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">
                                    Replace the current artwork with an image from a public URL.
                                </p>
                            </div>

                            <div className="flex min-w-0 max-w-2xl flex-col gap-4">
                                <GoogleCoverSearch
                                    mediaId={mediaId}
                                    mediaType={mediaType}
                                    mediaName={mediaName}
                                    className="items-start"
                                    disabled={editMediaMutation.isPending}
                                    authors={"authors" in apiData.fields ? apiData.fields.authors : undefined}
                                    onUseCover={url => form.setValue("imageCover", url, { shouldDirty: true, shouldValidate: true })}
                                />
                                <Controller
                                    name="imageCover"
                                    control={form.control}
                                    render={({ field, fieldState }) =>
                                        <Field
                                            className="max-w-2xl"
                                            data-invalid={fieldState.invalid}
                                            data-disabled={editMediaMutation.isPending}
                                        >
                                            <FieldLabel htmlFor={`${fieldId}-image-cover`}>
                                                Image Cover URL
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                id={`${fieldId}-image-cover`}
                                                aria-invalid={fieldState.invalid}
                                                value={field.value == null ? "" : String(field.value)}
                                            />
                                            <FieldDescription>
                                                Leave this empty to keep the current cover.
                                            </FieldDescription>
                                            <FieldError errors={[fieldState.error]}/>
                                        </Field>
                                    }
                                />
                            </div>
                        </section>

                        <section className="mt-5 grid grid-cols-[minmax(12rem,0.35fr)_minmax(0,1fr)] gap-10 rounded-xl border p-5
                            shadow-xs max-lg:grid-cols-1 max-lg:gap-5 sm:p-6">
                            <div>
                                <div className="text-xs font-semibold text-brand">
                                    02
                                </div>
                                <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                                    Media information
                                </h2>
                                <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">
                                    Review the title, release data, credits, and type-specific details.
                                </p>
                            </div>

                            <div className="grid min-w-0 grid-cols-2 gap-x-5 gap-y-5 max-md:grid-cols-1">
                                {Object.keys(apiData.fields).map(renderField)}
                            </div>
                        </section>
                    </FieldSet>

                    <FormError/>

                    <div className="flex items-center justify-between gap-4 py-5 max-sm:flex-col-reverse max-sm:items-stretch">
                        <Button type="button" variant="ghost" onClick={() => history.go(-1)}>
                            <ArrowLeft data-icon="inline-start"/>
                            Cancel
                        </Button>
                        <FormSubmitButton icon={<Save data-icon="inline-start"/>} isLoading={editMediaMutation.isPending}>
                            Save changes
                        </FormSubmitButton>
                    </div>
                </form>
            </FormProvider>
        </div>
    );
}
