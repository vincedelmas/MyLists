import {toast} from "sonner";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {splitIntoColumns} from "@/lib/utils/arrays";
import {capitalize} from "@/lib/utils/text-formatting";
import {Input} from "@/lib/client/components/ui/input";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Textarea} from "@/lib/client/components/ui/textarea";
import {FormError} from "@/lib/client/components/forms/FormError";
import {createFileRoute, useRouter} from "@tanstack/react-router";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {editMediaDetailsOptions} from "@/lib/client/react-query/query-options";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {useEditMediaMutation} from "@/lib/client/react-query/query-mutations/media.mutations";
import {EditMediaDetailsPayload, editMediaDetailsPayloadSchema, mediaTypeMediaIdSchema} from "@/lib/schemas";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/lib/client/components/ui/form";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";


export const Route = createFileRoute("/_main/_private/details/edit/$mediaType/$mediaId")({
    params: {
        parse: (params) => {
            const result = mediaTypeMediaIdSchema.safeParse(params);
            if (!result.success) return false;
            return result.data;
        },
    },
    loader: ({ context: { queryClient }, params: { mediaType, mediaId } }) => {
        return queryClient.ensureQueryData(editMediaDetailsOptions(mediaType, mediaId));
    },
    component: MediaEditPage,
});


function MediaEditPage() {
    const { history } = useRouter();
    const { mediaType, mediaId } = Route.useParams();
    const editMediaMutation = useEditMediaMutation({ noErrorToast: true });
    const apiData = useSuspenseQuery(editMediaDetailsOptions(mediaType, mediaId)).data;

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
                toast.success("Media successfully updated!");
            },
        });
    };

    const renderField = (myForm: any, fieldEntry: [string, any]) => {
        const [key, _] = fieldEntry;

        return (
            <FormField
                key={key}
                name={key}
                control={myForm.control}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{capitalize(key.replaceAll("_", " "))}</FormLabel>
                        <FormControl>
                            {key === "synopsis"
                                ? <Textarea {...field} className="h-60"/>
                                : <Input {...field}/>
                            }
                        </FormControl>
                        <FormMessage/>
                    </FormItem>
                )}
            />
        );
    };

    return (
        <PageTitle title={`Edit ${capitalize(mediaType)} Details`} subtitle={`Update the media information`}>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-5 mx-auto w-full">
                    <fieldset disabled={editMediaMutation.isPending} className="space-y-5">
                        <div className="grid grid-cols-3 gap-8 max-sm:grid-cols-1">
                            <div className="space-y-4">
                                <FormField
                                    name="imageCover"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>ImageCover URL</FormLabel>
                                            <FormControl>
                                                <Input {...field}/>
                                            </FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />
                                {parts[0].map(array => renderField(form, array))}
                            </div>
                            <div className="space-y-4">
                                {parts[1].map(array => renderField(form, array))}
                            </div>
                            <div className="space-y-4">
                                {parts[2].map(arr => renderField(form, arr))}
                            </div>
                        </div>
                    </fieldset>
                    <FormError/>
                    <div className="flex justify-end">
                        <FormSubmitButton isLoading={editMediaMutation.isPending}>
                            Save Changes
                        </FormSubmitButton>
                    </div>
                </form>
            </Form>
        </PageTitle>
    );
}
