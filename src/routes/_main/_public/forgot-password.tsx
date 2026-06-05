import {toast} from "sonner";
import {useState} from "react";
import {useForm} from "react-hook-form";
import {LoaderCircle} from "lucide-react";
import authClient from "@/lib/utils/auth-client";
import {Input} from "@/lib/client/components/ui/input";
import {createFileRoute} from "@tanstack/react-router";
import {Button} from "@/lib/client/components/ui/button";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/lib/client/components/ui/form";


export const Route = createFileRoute("/_main/_public/forgot-password")({
    component: ForgotPasswordPage,
})


function ForgotPasswordPage() {
    const navigate = Route.useNavigate();
    const [emailSent, setEmailSent] = useState(false);
    const form = useForm<{ email: string }>({
        defaultValues: {
            email: "",
        },
    });

    const onSubmit = async (submitted: { email: string }) => {
        await authClient.requestPasswordReset({
            email: submitted.email,
            redirectTo: "/reset-password",
        }, {
            onError: (ctx) => {
                toast.error(ctx.error.message);
            },
            onSuccess: async () => {
                setEmailSent(true);
                toast.success(`You will be redirected in 5 seconds to the main page.`, { duration: 5 * 1000 });
                setTimeout(async () => {
                    await navigate({ to: "/", replace: true });
                }, 5 * 1000);
            },
        });
    };

    return (
        <PageTitle title="Forgot password" subtitle="Enter the email associated with your account to reset your password">
            <div className="mt-4 max-w-75">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            name="email"
                            control={form.control}
                            rules={{ required: "Email is required" }}
                            render={({ field }) =>
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            type="email"
                                            placeholder="john.doe@example.com"
                                            disabled={form.formState.isSubmitting}
                                        />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            }
                        />
                        {emailSent &&
                            <p className="text-sm text-center font-medium text-green-600">
                                An email has been sent to reset your password. Please check your inbox.
                            </p>
                        }
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting && <LoaderCircle className="size-4 animate-spin"/>} Submit
                        </Button>
                    </form>
                </Form>
            </div>
        </PageTitle>
    );
}
