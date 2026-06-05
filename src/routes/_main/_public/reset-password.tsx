import {toast} from "sonner";
import {useForm} from "react-hook-form";
import {LoaderCircle} from "lucide-react";
import authClient from "@/lib/utils/auth-client";
import {Input} from "@/lib/client/components/ui/input";
import {createFileRoute} from "@tanstack/react-router";
import {Button} from "@/lib/client/components/ui/button";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/lib/client/components/ui/form";


export const Route = createFileRoute("/_main/_public/reset-password")({
    validateSearch: (search) => search as { token: string },
    loaderDeps: ({ search }) => ({ search }),
    component: ResetPasswordPage,
});


type FormValues = {
    newPassword: string,
    confirmPassword: string,
}


function ResetPasswordPage() {
    const { token } = Route.useSearch();
    const navigate = Route.useNavigate();
    const form = useForm<FormValues>({
        defaultValues: {
            newPassword: "",
            confirmPassword: "",
        }
    });

    const onSubmit = async (submitted: FormValues) => {
        if (!token) {
            toast.error("The provided token is invalid or expired.");
            return navigate({ to: "/", replace: true });
        }

        await authClient.resetPassword({ token, newPassword: submitted.newPassword }, {
            onError: () => {
                toast.error("An unexpected error occurred. Please try again later.");
            },
            onSuccess: async () => {
                form.reset();
                await navigate({ to: "/login", replace: true });
                toast.success("Your password was successfully modified");
            }
        });
    };

    return (
        <PageTitle title="Reset Your Password" subtitle="You can now change your password to a new one">
            <div className="mt-4 w-75 max-sm:w-full">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <fieldset disabled={form.formState.isSubmitting}>
                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="newPassword"
                                    rules={{
                                        required: "The password is required.",
                                        minLength: { value: 8, message: "The password is too short (8 min)." },
                                        maxLength: { value: 50, message: "The password is too long (128 max)." },
                                    }}
                                    render={({ field }) =>
                                        <FormItem>
                                            <FormLabel>Password</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    type="password"
                                                    placeholder="********"
                                                />
                                            </FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    }
                                />
                                <FormField
                                    control={form.control}
                                    name="confirmPassword"
                                    rules={{
                                        required: "The password confirmation is required.",
                                        validate: (val) => {
                                            if (form.watch("newPassword") !== val) return "The passwords do not match.";
                                        }
                                    }}
                                    render={({ field }) =>
                                        <FormItem>
                                            <FormLabel>Confirm Password</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    type="password"
                                                    placeholder="********"
                                                />
                                            </FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    }
                                />
                            </div>
                        </fieldset>
                        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting && <LoaderCircle className="size-4 animate-spin"/>} Submit
                        </Button>
                    </form>
                </Form>
            </div>
        </PageTitle>
    );
}
