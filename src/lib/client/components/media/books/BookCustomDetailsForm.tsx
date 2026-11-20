import {MediaType} from "@/lib/utils/enums";
import {zodResolver} from "@hookform/resolvers/zod";
import {FormProvider, useForm} from "react-hook-form";
import {handleServerFormErrors} from "@/lib/client/forms";
import {toDateInputValue} from "@/lib/utils/formatting/date";
import {FormError} from "@/lib/client/components/forms/FormError";
import {FieldGroup, FieldSet} from "@/lib/client/components/ui/field";
import {FormTextField} from "@/lib/client/components/forms/FormTextField";
import type {ExtractUserMediaByType} from "@/lib/types/query.options.types";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {useUpdateUserBookDetailsMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {updateUserBookDetailsSchema, type UpdateUserBookDetailsInput, type UpdateUserBookDetailsPayload} from "@/lib/schemas/books.schema";


interface BookCustomDetailsFormProps {
    disabled?: boolean;
    userMedia: ExtractUserMediaByType<typeof MediaType.BOOKS>;
}


export function BookCustomDetailsForm({ userMedia, disabled = false }: BookCustomDetailsFormProps) {
    const mutation = useUpdateUserBookDetailsMutation(userMedia.mediaId, { noErrorToast: true });
    const form = useForm<UpdateUserBookDetailsInput, unknown, UpdateUserBookDetailsPayload>({
        resolver: zodResolver(updateUserBookDetailsSchema),
        values: {
            mediaId: userMedia.mediaId,
            customTitle: userMedia.customTitle,
            customPages: userMedia.customPages,
            customPublisher: userMedia.customPublisher ?? "",
            customLanguage: userMedia.customLanguage ?? "",
            customReleaseDate: toDateInputValue(userMedia.customReleaseDate ?? undefined),
        },
    });

    const isPending = disabled || mutation.isPending;

    const onSubmit = (data: UpdateUserBookDetailsPayload) => {
        mutation.mutate({ data }, {
            onError: (error) => handleServerFormErrors(form, error),
        });
    };

    return (
        <div className="px-4">
            <FormProvider {...form}>
                <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
                    <FieldSet disabled={isPending}>
                        <FieldGroup className="gap-3">
                            <FormTextField
                                type="text"
                                label="Title"
                                required={true}
                                name="customTitle"
                                control={form.control}
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <FormTextField
                                    min={0}
                                    type="number"
                                    required={true}
                                    name="customPages"
                                    label="Total pages"
                                    control={form.control}
                                />
                                <FormTextField
                                    type="text"
                                    label="Language"
                                    name="customLanguage"
                                    control={form.control}
                                    placeholder="e.g. en, fr"
                                />
                            </div>
                            <FormTextField
                                type="text"
                                label="Publisher"
                                name="customPublisher"
                                control={form.control}
                            />
                            <FormTextField
                                type="date"
                                control={form.control}
                                label="Publication date"
                                name="customReleaseDate"
                            />
                        </FieldGroup>
                    </FieldSet>
                    <FormError/>
                    <FormSubmitButton className="w-full" isLoading={mutation.isPending} disabled={isPending || !form.formState.isDirty}>
                        Save Edition Details
                    </FormSubmitButton>
                </form>
            </FormProvider>
        </div>
    );
}
