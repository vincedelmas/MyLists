import type {ReactNode} from "react";
import {toast} from "sonner";
import {zodResolver} from "@hookform/resolvers/zod";
import {
    useFieldArray,
    useForm,
    type FieldPath,
    type FieldValues,
    type UseFormRegisterReturn,
    type UseFormReturn,
} from "react-hook-form";
import {useRouter} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {capitalize} from "@/lib/utils/text-formatting";
import {
    bookCatalogEditPayloadSchema,
    gameCatalogEditPayloadSchema,
    mangaCatalogEditPayloadSchema,
    movieCatalogEditPayloadSchema,
    tvCatalogEditPayloadSchema,
    type BookCatalogEditPayload,
    type BookCatalogEditPayloadInput,
    type CatalogEditFields,
    type GameCatalogEditPayload,
    type GameCatalogEditPayloadInput,
    type MangaCatalogEditPayload,
    type MangaCatalogEditPayloadInput,
    type MovieCatalogEditPayload,
    type MovieCatalogEditPayloadInput,
    type TvCatalogEditPayload,
    type TvCatalogEditPayloadInput,
} from "@/lib/contracts/media/catalog-edit";
import {Input} from "@/lib/client/components/ui/input";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import {Textarea} from "@/lib/client/components/ui/textarea";
import {FormError} from "@/lib/client/components/forms/FormError";
import {handleServerFormErrors} from "@/lib/client/components/forms/forms";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {useEditMediaMutation} from "@/lib/client/react-query/query-mutations/media.mutations";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/lib/client/components/ui/form";
import {Button} from "@/lib/client/components/ui/button";


type FieldsFor<K extends MediaType> = Extract<CatalogEditFields, { kind: K }>["fields"];

interface FamilyCatalogEditFormProps<K extends MediaType> {
    mediaId: number;
    fields: FieldsFor<K>;
}


export const TvCatalogEditForm = ({
    mediaType,
    mediaId,
    fields,
}: FamilyCatalogEditFormProps<typeof MediaType.SERIES> & { mediaType: typeof MediaType.SERIES } |
    FamilyCatalogEditFormProps<typeof MediaType.ANIME> & { mediaType: typeof MediaType.ANIME }) => {
    const { history } = useRouter();
    const mutation = useEditMediaMutation({ noErrorToast: true });
    const form = useForm<TvCatalogEditPayloadInput, unknown, TvCatalogEditPayload>({
        resolver: zodResolver(tvCatalogEditPayloadSchema),
        defaultValues: { imageCover: undefined, ...fields },
    });

    const onSubmit = (payload: TvCatalogEditPayload) => {
        const request = mediaType === MediaType.SERIES
            ? { mediaType: MediaType.SERIES, mediaId, payload }
            : { mediaType: MediaType.ANIME, mediaId, payload };
        mutation.mutate({ data: request }, editCallbacks(form, history));
    };

    return (
        <CatalogEditFormLayout form={form} onSubmit={onSubmit} isPending={mutation.isPending}>
            <CatalogFieldsGrid>
                <CatalogFieldsColumn>
                    <CatalogTextField form={form} name="imageCover" label="Image cover URL"/>
                    <CatalogTextField form={form} name="name"/>
                    <CatalogTextField form={form} name="originalName"/>
                    <CatalogTextField form={form} name="releaseDate"/>
                    <CatalogTextField form={form} name="lastAirDate"/>
                </CatalogFieldsColumn>
                <CatalogFieldsColumn>
                    <CatalogTextField form={form} name="homepage"/>
                    <CatalogTextField form={form} name="createdBy"/>
                    <CatalogTextField form={form} name="duration" type="number"/>
                    <CatalogTextField form={form} name="originCountry"/>
                    <CatalogTextField form={form} name="prodStatus" label="Production status"/>
                </CatalogFieldsColumn>
                <CatalogFieldsColumn>
                    <CatalogTextareaField form={form} name="synopsis"/>
                    <CatalogBooleanField form={form} name="lockStatus" label="Lock catalog entry"/>
                </CatalogFieldsColumn>
            </CatalogFieldsGrid>
        </CatalogEditFormLayout>
    );
};


export const MovieCatalogEditForm = ({ mediaId, fields }: FamilyCatalogEditFormProps<typeof MediaType.MOVIES>) => {
    const { history } = useRouter();
    const mutation = useEditMediaMutation({ noErrorToast: true });
    const form = useForm<MovieCatalogEditPayloadInput, unknown, MovieCatalogEditPayload>({
        resolver: zodResolver(movieCatalogEditPayloadSchema),
        defaultValues: { imageCover: undefined, ...fields },
    });
    const onSubmit = (payload: MovieCatalogEditPayload) => mutation.mutate({
        data: { mediaType: MediaType.MOVIES, mediaId, payload },
    }, editCallbacks(form, history));

    return (
        <CatalogEditFormLayout form={form} onSubmit={onSubmit} isPending={mutation.isPending}>
            <CatalogFieldsGrid>
                <CatalogFieldsColumn>
                    <CatalogTextField form={form} name="imageCover" label="Image cover URL"/>
                    <CatalogTextField form={form} name="name"/>
                    <CatalogTextField form={form} name="originalName"/>
                    <CatalogTextField form={form} name="directorName"/>
                    <CatalogTextField form={form} name="releaseDate"/>
                </CatalogFieldsColumn>
                <CatalogFieldsColumn>
                    <CatalogTextField form={form} name="duration" type="number"/>
                    <CatalogTextField form={form} name="budget" type="number"/>
                    <CatalogTextField form={form} name="revenue" type="number"/>
                    <CatalogTextField form={form} name="tagline"/>
                    <CatalogTextField form={form} name="originalLanguage"/>
                    <CatalogTextField form={form} name="homepage"/>
                </CatalogFieldsColumn>
                <CatalogFieldsColumn>
                    <CatalogTextareaField form={form} name="synopsis"/>
                    <CatalogBooleanField form={form} name="lockStatus" label="Lock catalog entry"/>
                </CatalogFieldsColumn>
            </CatalogFieldsGrid>
        </CatalogEditFormLayout>
    );
};


export const GameCatalogEditForm = ({ mediaId, fields }: FamilyCatalogEditFormProps<typeof MediaType.GAMES>) => {
    const { history } = useRouter();
    const mutation = useEditMediaMutation({ noErrorToast: true });
    const form = useForm<GameCatalogEditPayloadInput, unknown, GameCatalogEditPayload>({
        resolver: zodResolver(gameCatalogEditPayloadSchema),
        defaultValues: { imageCover: undefined, ...fields },
    });
    const onSubmit = (payload: GameCatalogEditPayload) => mutation.mutate({
        data: { mediaType: MediaType.GAMES, mediaId, payload },
    }, editCallbacks(form, history));

    return (
        <CatalogEditFormLayout form={form} onSubmit={onSubmit} isPending={mutation.isPending}>
            <CatalogFieldsGrid>
                <CatalogFieldsColumn>
                    <CatalogTextField form={form} name="imageCover" label="Image cover URL"/>
                    <CatalogTextField form={form} name="name"/>
                    <CatalogTextField form={form} name="releaseDate"/>
                    <CatalogTextField form={form} name="gameEngine"/>
                </CatalogFieldsColumn>
                <CatalogFieldsColumn>
                    <CatalogTextField form={form} name="gameModes"/>
                    <CatalogTextField form={form} name="playerPerspective"/>
                    <CatalogTextField form={form} name="hltbMainTime" label="HLTB main time" type="number"/>
                    <CatalogTextField form={form} name="hltbMainAndExtraTime" label="HLTB main + extra time" type="number"/>
                    <CatalogTextField form={form} name="hltbTotalCompleteTime" label="HLTB completionist time" type="number"/>
                </CatalogFieldsColumn>
                <CatalogFieldsColumn>
                    <CatalogTextareaField form={form} name="synopsis"/>
                    <CatalogBooleanField form={form} name="lockStatus" label="Lock catalog entry"/>
                </CatalogFieldsColumn>
            </CatalogFieldsGrid>
        </CatalogEditFormLayout>
    );
};


export const BookCatalogEditForm = ({ mediaId, fields }: FamilyCatalogEditFormProps<typeof MediaType.BOOKS>) => {
    const { history } = useRouter();
    const mutation = useEditMediaMutation({ noErrorToast: true });
    const form = useForm<BookCatalogEditPayloadInput, unknown, BookCatalogEditPayload>({
        resolver: zodResolver(bookCatalogEditPayloadSchema),
        defaultValues: { imageCover: undefined, ...fields },
    });
    const authors = useFieldArray({ control: form.control, name: "authors" });
    const onSubmit = (payload: BookCatalogEditPayload) => mutation.mutate({
        data: { mediaType: MediaType.BOOKS, mediaId, payload },
    }, editCallbacks(form, history));

    return (
        <CatalogEditFormLayout form={form} onSubmit={onSubmit} isPending={mutation.isPending}>
            <CatalogFieldsGrid>
                <CatalogFieldsColumn>
                    <CatalogTextField form={form} name="imageCover" label="Image cover URL"/>
                    <CatalogTextField form={form} name="name"/>
                    <CatalogTextField form={form} name="releaseDate"/>
                    <CatalogTextField form={form} name="pages" type="number"/>
                </CatalogFieldsColumn>
                <CatalogFieldsColumn>
                    <CatalogTextField form={form} name="language"/>
                    <CatalogTextField form={form} name="publishers"/>
                    <CatalogRelationField
                        label="Authors"
                        singularLabel="Author"
                        rows={authors.fields}
                        registerName={(index) => form.register(`authors.${index}.name`)}
                        append={() => authors.append({ name: "" })}
                        remove={authors.remove}
                    />
                </CatalogFieldsColumn>
                <CatalogFieldsColumn>
                    <CatalogTextareaField form={form} name="synopsis"/>
                    <CatalogBooleanField form={form} name="lockStatus" label="Lock catalog entry"/>
                </CatalogFieldsColumn>
            </CatalogFieldsGrid>
        </CatalogEditFormLayout>
    );
};


export const MangaCatalogEditForm = ({ mediaId, fields }: FamilyCatalogEditFormProps<typeof MediaType.MANGA>) => {
    const { history } = useRouter();
    const mutation = useEditMediaMutation({ noErrorToast: true });
    const form = useForm<MangaCatalogEditPayloadInput, unknown, MangaCatalogEditPayload>({
        resolver: zodResolver(mangaCatalogEditPayloadSchema),
        defaultValues: { imageCover: undefined, ...fields },
    });
    const genres = useFieldArray({ control: form.control, name: "genres" });
    const onSubmit = (payload: MangaCatalogEditPayload) => mutation.mutate({
        data: { mediaType: MediaType.MANGA, mediaId, payload },
    }, editCallbacks(form, history));

    return (
        <CatalogEditFormLayout form={form} onSubmit={onSubmit} isPending={mutation.isPending}>
            <CatalogFieldsGrid>
                <CatalogFieldsColumn>
                    <CatalogTextField form={form} name="imageCover" label="Image cover URL"/>
                    <CatalogTextField form={form} name="name"/>
                    <CatalogTextField form={form} name="releaseDate"/>
                </CatalogFieldsColumn>
                <CatalogFieldsColumn>
                    <CatalogTextField form={form} name="chapters" type="number"/>
                    <CatalogTextField form={form} name="publishers"/>
                    <CatalogRelationField
                        label="Genres"
                        singularLabel="Genre"
                        rows={genres.fields}
                        registerName={(index) => form.register(`genres.${index}.name`)}
                        append={() => genres.append({ name: "" })}
                        remove={genres.remove}
                    />
                </CatalogFieldsColumn>
                <CatalogFieldsColumn>
                    <CatalogTextareaField form={form} name="synopsis"/>
                    <CatalogBooleanField form={form} name="lockStatus" label="Lock catalog entry"/>
                </CatalogFieldsColumn>
            </CatalogFieldsGrid>
        </CatalogEditFormLayout>
    );
};


const editCallbacks = <TInput extends FieldValues, TOutput extends FieldValues>(
    form: UseFormReturn<TInput, unknown, TOutput>,
    history: ReturnType<typeof useRouter>["history"],
) => ({
    onError: (error: Error) => handleServerFormErrors(form, error),
    onSuccess: () => {
        history.go(-1);
        toast.success("Media successfully updated!");
    },
});


interface CatalogEditFormLayoutProps<TInput extends FieldValues, TOutput extends FieldValues> {
    form: UseFormReturn<TInput, unknown, TOutput>;
    onSubmit: (data: TOutput) => void;
    isPending: boolean;
    children: ReactNode;
}


const CatalogEditFormLayout = <TInput extends FieldValues, TOutput extends FieldValues>({
    form,
    onSubmit,
    isPending,
    children,
}: CatalogEditFormLayoutProps<TInput, TOutput>) => (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-5 mx-auto w-full">
            <fieldset disabled={isPending} className="space-y-5">{children}</fieldset>
            <FormError/>
            <div className="flex justify-end">
                <FormSubmitButton isLoading={isPending}>Save Changes</FormSubmitButton>
            </div>
        </form>
    </Form>
);


const CatalogFieldsGrid = ({ children }: { children: ReactNode }) => (
    <div className="grid grid-cols-3 gap-8 max-sm:grid-cols-1">{children}</div>
);


const CatalogFieldsColumn = ({ children }: { children: ReactNode }) => (
    <div className="space-y-4">{children}</div>
);


interface CatalogFieldProps<TInput extends FieldValues, TOutput extends FieldValues> {
    form: UseFormReturn<TInput, unknown, TOutput>;
    name: FieldPath<TInput>;
    label?: string;
    help?: string;
}

interface CatalogTextFieldProps<TInput extends FieldValues, TOutput extends FieldValues>
    extends CatalogFieldProps<TInput, TOutput> {
    type?: "text" | "number";
}


const CatalogTextField = <TInput extends FieldValues, TOutput extends FieldValues>({
    form,
    name,
    label,
    help,
    type = "text",
}: CatalogTextFieldProps<TInput, TOutput>) => (
    <FormField
        name={name}
        control={form.control}
        render={({ field }) => (
            <FormItem>
                <FormLabel>{label ?? fieldLabel(name)}</FormLabel>
                <FormControl>
                    <Input
                        ref={field.ref}
                        name={field.name}
                        type={type}
                        min={type === "number" ? 0 : undefined}
                        step={type === "number" ? "any" : undefined}
                        value={inputValue(field.value)}
                        onBlur={field.onBlur}
                        onChange={field.onChange}
                    />
                </FormControl>
                {help && <p className="text-xs text-muted-foreground">{help}</p>}
                <FormMessage/>
            </FormItem>
        )}
    />
);


const CatalogTextareaField = <TInput extends FieldValues, TOutput extends FieldValues>({
    form,
    name,
    label,
}: CatalogFieldProps<TInput, TOutput>) => (
    <FormField
        name={name}
        control={form.control}
        render={({ field }) => (
            <FormItem>
                <FormLabel>{label ?? fieldLabel(name)}</FormLabel>
                <FormControl>
                    <Textarea
                        ref={field.ref}
                        name={field.name}
                        value={inputValue(field.value)}
                        onBlur={field.onBlur}
                        onChange={field.onChange}
                        className="h-60"
                    />
                </FormControl>
                <FormMessage/>
            </FormItem>
        )}
    />
);


const CatalogBooleanField = <TInput extends FieldValues, TOutput extends FieldValues>({
    form,
    name,
    label,
}: CatalogFieldProps<TInput, TOutput>) => (
    <FormField
        name={name}
        control={form.control}
        render={({ field }) => (
            <FormItem className="flex items-center gap-3 rounded-md border p-4">
                <FormControl>
                    <Checkbox checked={field.value === true} onCheckedChange={(value) => field.onChange(value === true)}/>
                </FormControl>
                <FormLabel className="m-0 cursor-pointer">{label ?? fieldLabel(name)}</FormLabel>
                <FormMessage/>
            </FormItem>
        )}
    />
);


interface CatalogRelationFieldProps {
    label: string;
    singularLabel: string;
    rows: readonly { id: string }[];
    registerName: (index: number) => UseFormRegisterReturn;
    append: () => void;
    remove: (index: number) => void;
}


const CatalogRelationField = ({
    label,
    singularLabel,
    rows,
    registerName,
    append,
    remove,
}: CatalogRelationFieldProps) => (
    <fieldset className="space-y-2 rounded-md border p-3">
        <div className="flex items-center justify-between gap-3">
            <legend className="text-sm font-medium">{label}</legend>
            <Button type="button" variant="outline" size="sm" onClick={append}>Add {singularLabel.toLowerCase()}</Button>
        </div>
        {rows.length === 0 && <p className="text-xs text-muted-foreground">No {label.toLowerCase()}.</p>}
        {rows.map((row, index) => (
            <div key={row.id} className="flex items-center gap-2">
                <Input aria-label={`${singularLabel} ${index + 1}`} {...registerName(index)}/>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                    Remove
                </Button>
            </div>
        ))}
    </fieldset>
);


const inputValue = (value: unknown): string | number =>
    typeof value === "string" || typeof value === "number" ? value : "";

const fieldLabel = (name: string) => capitalize(name.replace(/([A-Z])/g, " $1").replaceAll("_", " "));
