import {useId} from "react";
import {Plus} from "lucide-react";
import {MediaType} from "@/lib/utils/enums";
import {useNavigate} from "@tanstack/react-router";
import {zodResolver} from "@hookform/resolvers/zod";
import {handleServerFormErrors} from "@/lib/client/forms";
import {Textarea} from "@/lib/client/components/ui/textarea";
import {FormError} from "@/lib/client/components/forms/FormError";
import {Controller, FormProvider, useForm} from "react-hook-form";
import {FormTextField} from "@/lib/client/components/forms/FormTextField";
import {booksDefinition} from "@/lib/media-definitions/books/books.definition";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {useCreateBookMutation} from "@/lib/client/react-query/query-mutations/media.mutations";
import {createBookSchema, type CreateBookInput, type CreateBookPayload} from "@/lib/schemas/books.schema";
import {Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSet} from "@/lib/client/components/ui/field";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


const fields = [
    { name: "name", label: "Title", type: "text" },
    { name: "authors", label: "Authors", type: "text", description: "Separate names with commas." },
    { name: "pages", label: "Number of pages", type: "number" },
    { name: "releaseDate", label: "Publication date", type: "date" },
    { name: "publishers", label: "Publisher", type: "text" },
    { name: "language", label: "Language", type: "text", description: "Use language code, e.g. fr (French), en (English), ja (Japanese), etc." },
    { name: "imageCover", label: "Cover image URL", type: "url" },
] as const;


export function BooksManualEntryForm({ initialTitle = "" }: { initialTitle?: string }) {
    const id = useId();
    const navigate = useNavigate();
    const mutation = useCreateBookMutation();
    const form = useForm<CreateBookInput, unknown, CreateBookPayload>({
        resolver: zodResolver(createBookSchema),
        defaultValues: { name: initialTitle, authors: "", pages: "", genres: [] },
    });

    const onSubmit = (data: CreateBookPayload) => {
        mutation.mutate({ data }, {
            onError: (error) => handleServerFormErrors(form, error),
            onSuccess: ({ mediaId }) => {
                void navigate({ to: "/details/$mediaType/$mediaId", params: { mediaType: MediaType.BOOKS, mediaId } });
            },
        });
    };

    return (
        <FormProvider {...form}>
            <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
                <FieldSet disabled={mutation.isPending} className="rounded-xl border p-5 sm:p-6">
                    <FieldDescription>
                        All fields are required.
                        The book is added to your planned reading list on creation.
                    </FieldDescription>
                    <FieldGroup className="grid gap-5 sm:grid-cols-2">
                        {fields.map(({ name, label, type, ...options }) => {
                            const required = !createBookSchema.shape[name].safeParse(undefined).success;

                            return (
                                <FormTextField
                                    key={name}
                                    {...options}
                                    type={type}
                                    name={name}
                                    required={required}
                                    control={form.control}
                                    label={<>{label}{required && <span aria-hidden="true" className="text-brand">*</span>}</>}
                                />
                            );
                        })}
                        <Controller
                            name="genres"
                            control={form.control}
                            render={({ field, fieldState }) =>
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor={`${id}-genres`}>
                                        Genres <span aria-hidden="true" className="text-brand">*</span>
                                    </FieldLabel>
                                    <Select
                                        multiple={true}
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        items={booksDefinition.genres.map(value => ({ value, label: value }))}
                                    >
                                        <SelectTrigger
                                            ref={field.ref}
                                            className="w-full"
                                            id={`${id}-genres`}
                                            aria-required={true}
                                            onBlur={field.onBlur}
                                            aria-invalid={fieldState.invalid}
                                            aria-describedby={fieldState.error
                                                ? `${id}-genres-description ${id}-genres-error`
                                                : `${id}-genres-description`}
                                        >
                                            <SelectValue placeholder="Select genres"/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {booksDefinition.genres.map(genre =>
                                                    <SelectItem
                                                        key={genre}
                                                        value={genre}
                                                        disabled={field.value.length >= booksDefinition.maxGenres && !field.value.includes(genre)}
                                                    >
                                                        {genre}
                                                    </SelectItem>
                                                )}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    <FieldDescription id={`${id}-genres-description`}>
                                        Choose up to {booksDefinition.maxGenres} genres.
                                    </FieldDescription>
                                    <FieldError
                                        id={`${id}-genres-error`}
                                        errors={[fieldState.error]}
                                    />
                                </Field>
                            }
                        />

                        <Controller
                            name="synopsis"
                            control={form.control}
                            render={({ field, fieldState }) =>
                                <Field className="sm:col-span-2" data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor={`${id}-synopsis`}>
                                        Synopsis <span aria-hidden="true" className="text-brand">*</span>
                                    </FieldLabel>
                                    <Textarea
                                        {...field}
                                        required={true}
                                        className="min-h-32"
                                        id={`${id}-synopsis`}
                                        value={field.value ?? ""}
                                        aria-invalid={fieldState.invalid}
                                        aria-describedby={fieldState.error ? `${id}-synopsis-error` : undefined}
                                    />
                                    <FieldError
                                        id={`${id}-synopsis-error`}
                                        errors={[fieldState.error]}
                                    />
                                </Field>
                            }
                        />
                    </FieldGroup>
                </FieldSet>

                <FormError/>

                <FormSubmitButton
                    className="self-end"
                    isLoading={mutation.isPending}
                    icon={<Plus data-icon="inline-start"/>}
                >
                    Create and add to my list
                </FormSubmitButton>
            </form>
        </FormProvider>
    );
}
