import {useId} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {splitIntoColumns} from "@/lib/utils/arrays";
import {toast} from "@/lib/client/components/ui/toast";
import {Input} from "@/lib/client/components/ui/input";
import {capitalize} from "@/lib/utils/text-formatting";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Textarea} from "@/lib/client/components/ui/textarea";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";
import {FormError} from "@/lib/client/components/forms/FormError";
import {createFileRoute, useRouter} from "@tanstack/react-router";
import {Controller, FormProvider, useForm} from "react-hook-form";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {editMediaDetailsOptions} from "@/lib/client/react-query/query-options";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {useEditMediaMutation} from "@/lib/client/react-query/query-mutations/media.mutations";
import {Field, FieldError, FieldGroup, FieldLabel, FieldSet} from "@/lib/client/components/ui/field";
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
    const parts = splitIntoColumns(Object.entries(apiData.fields), 3);

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

    const renderField = (myForm: any, fieldEntry: [string, any]) => {
        const [key, _] = fieldEntry;

        return (
            <Controller
                key={key}
                name={key}
                control={myForm.control}
                render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} data-disabled={editMediaMutation.isPending}>
                        <FieldLabel htmlFor={`${fieldId}-${key}`}>{capitalize(key.replaceAll("_", " "))}</FieldLabel>
                        {key === "synopsis"
                            ? <Textarea {...field} id={`${fieldId}-${key}`} className="h-60" aria-invalid={fieldState.invalid}/>
                            : <Input {...field} id={`${fieldId}-${key}`} aria-invalid={fieldState.invalid}/>
                        }
                        <FieldError errors={[fieldState.error]}/>
                    </Field>
                )}
            />
        );
    };

    return (
        <PageTitle title={`Edit ${capitalize(mediaType)} Details`} subtitle={`Update the media information`}>
            <FormProvider {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto mt-6 flex w-full flex-col gap-5">
                    <FieldSet disabled={editMediaMutation.isPending}>
                        <div className="grid grid-cols-3 gap-8 max-sm:grid-cols-1">
                            <FieldGroup className="gap-4">
                                <Controller
                                    name="imageCover"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid} data-disabled={editMediaMutation.isPending}>
                                            <FieldLabel htmlFor={`${fieldId}-image-cover`}>Image Cover URL</FieldLabel>
                                            <Input {...field} id={`${fieldId}-image-cover`} aria-invalid={fieldState.invalid}/>
                                            <FieldError errors={[fieldState.error]}/>
                                        </Field>
                                    )}
                                />
                                {parts[0].map(array => renderField(form, array))}
                            </FieldGroup>
                            <FieldGroup className="gap-4">
                                {parts[1].map(array => renderField(form, array))}
                            </FieldGroup>
                            <FieldGroup className="gap-4">
                                {parts[2].map(arr => renderField(form, arr))}
                            </FieldGroup>
                        </div>
                    </FieldSet>
                    <FormError/>
                    <div className="flex justify-end">
                        <FormSubmitButton isLoading={editMediaMutation.isPending}>
                            Save Changes
                        </FormSubmitButton>
                    </div>
                </form>
            </FormProvider>
        </PageTitle>
    );
}
