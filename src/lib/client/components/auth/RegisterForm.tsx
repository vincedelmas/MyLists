import {zodResolver} from "@hookform/resolvers/zod";
import {FormProvider, useForm} from "react-hook-form";
import {Register, registerSchema} from "@/lib/schemas";
import {handleServerFormErrors} from "@/lib/client/forms";
import {FormError} from "@/lib/client/components/forms/FormError";
import {FieldGroup, FieldSet} from "@/lib/client/components/ui/field";
import {FormTextField} from "@/lib/client/components/forms/FormTextField";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {useEmailRegistrationMutation} from "@/lib/client/react-query/query-mutations/auth.mutations";


interface RegisterFormProps {
    verificationCallbackURL: string;
    onVerificationRequested: (email: string) => Promise<void>;
}


export const RegisterForm = ({ verificationCallbackURL, onVerificationRequested }: RegisterFormProps) => {
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
                        <FormTextField
                            name="username"
                            label="Username"
                            control={form.control}
                            placeholder="Username"
                            disabled={mutation.isPending}
                        />
                        <FormTextField
                            type="email"
                            name="email"
                            label="Email"
                            autoComplete="email"
                            control={form.control}
                            disabled={mutation.isPending}
                            placeholder="john.doe@example.com"
                        />
                        <FormTextField
                            name="password"
                            type="password"
                            label="Password"
                            control={form.control}
                            placeholder="********"
                            autoComplete="new-password"
                            disabled={mutation.isPending}
                        />
                        <FormTextField
                            type="password"
                            name="confirmPassword"
                            control={form.control}
                            placeholder="********"
                            label="Confirm Password"
                            autoComplete="new-password"
                            disabled={mutation.isPending}
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
