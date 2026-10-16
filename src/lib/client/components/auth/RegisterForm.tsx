import {useId} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {Input} from "@/lib/client/components/ui/input";
import {Register, registerSchema} from "@/lib/schemas";
import {handleServerFormErrors} from "@/lib/client/forms";
import {FormError} from "@/lib/client/components/forms/FormError";
import {Controller, FormProvider, useForm} from "react-hook-form";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {useEmailRegistrationMutation} from "@/lib/client/react-query/query-mutations/auth.mutations";
import {Field, FieldError, FieldGroup, FieldLabel, FieldSet} from "@/lib/client/components/ui/field";


interface RegisterFormProps {
    verificationCallbackURL: string;
    onVerificationRequested: (email: string) => Promise<void>;
}


export const RegisterForm = ({ verificationCallbackURL, onVerificationRequested }: RegisterFormProps) => {
    const fieldId = useId();
    const mutation = useEmailRegistrationMutation(verificationCallbackURL);
    const form = useForm<Register>({
        resolver: zodResolver(registerSchema),
        shouldFocusError: false,
        defaultValues: {
            email: "",
            username: "",
            password: "",
            confirmPassword: "",
        },
    });

    const handleSubmit = (submitted: Register) => {
        form.clearErrors("root");

        mutation.mutate(submitted, {
            onError: (error) => {
                if (error.code === "USERNAME_TAKEN" || error.code === "INVALID_USERNAME") {
                    form.setError("username", { message: error.message });
                    return;
                }

                handleServerFormErrors(form, error);
            },
            onSuccess: async () => {
                await onVerificationRequested(submitted.email);
            },
        });
    };

    return (
        <FormProvider {...form}>
            <form className="mt-2 flex flex-col gap-4" onSubmit={form.handleSubmit(handleSubmit)}>
                <FieldSet disabled={mutation.isPending}>
                    <FieldGroup>
                        <Controller
                            name="username"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid} data-disabled={mutation.isPending}>
                                    <FieldLabel htmlFor={`${fieldId}-username`}>Username</FieldLabel>
                                    <Input
                                        {...field}
                                        placeholder="Username"
                                        id={`${fieldId}-username`}
                                        aria-invalid={fieldState.invalid}
                                    />
                                    <FieldError errors={[fieldState.error]}/>
                                </Field>
                            )}
                        />
                        <Controller
                            name="email"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid} data-disabled={mutation.isPending}>
                                    <FieldLabel htmlFor={`${fieldId}-email`}>Email</FieldLabel>
                                    <Input
                                        {...field}
                                        type="email"
                                        id={`${fieldId}-email`}
                                        autoComplete="email"
                                        aria-invalid={fieldState.invalid}
                                        placeholder="john.doe@example.com"
                                    />
                                    <FieldError errors={[fieldState.error]}/>
                                </Field>
                            )}
                        />
                        <Controller
                            name="password"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid} data-disabled={mutation.isPending}>
                                    <FieldLabel htmlFor={`${fieldId}-password`}>Password</FieldLabel>
                                    <Input
                                        {...field}
                                        type="password"
                                        placeholder="********"
                                        autoComplete="new-password"
                                        id={`${fieldId}-password`}
                                        aria-invalid={fieldState.invalid}
                                    />
                                    <FieldError errors={[fieldState.error]}/>
                                </Field>
                            )}
                        />
                        <Controller
                            name="confirmPassword"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid} data-disabled={mutation.isPending}>
                                    <FieldLabel htmlFor={`${fieldId}-confirm-password`}>Confirm Password</FieldLabel>
                                    <Input
                                        {...field}
                                        type="password"
                                        placeholder="********"
                                        autoComplete="new-password"
                                        aria-invalid={fieldState.invalid}
                                        id={`${fieldId}-confirm-password`}
                                    />
                                    <FieldError errors={[fieldState.error]}/>
                                </Field>
                            )}
                        />
                    </FieldGroup>
                </FieldSet>
                <FormError/>
                <LoadingButton type="submit" className="mb-4 w-full" isLoading={mutation.isPending}>
                    {mutation.isPending ? "Creating your account…" : "Create an account"}
                </LoadingButton>
            </form>
        </FormProvider>
    );
};
