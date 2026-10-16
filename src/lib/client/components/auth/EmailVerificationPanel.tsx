import {useForm} from "react-hook-form";
import {Link} from "@tanstack/react-router";
import {zodResolver} from "@hookform/resolvers/zod";
import {Badge} from "@/lib/client/components/ui/badge";
import {buttonVariants} from "@/lib/client/components/ui/button";
import {ForgotPassword, forgotPasswordSchema} from "@/lib/schemas";
import {FieldGroup, FieldSet} from "@/lib/client/components/ui/field";
import {FormTextField} from "@/lib/client/components/forms/FormTextField";
import {ClockAlert, MailCheck, RefreshCw, ShieldAlert} from "lucide-react";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {useResendVerificationEmailMutation} from "@/lib/client/react-query/query-mutations/auth.mutations";
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/lib/client/components/ui/empty";


export type VerificationStatus = "pending" | "expired" | "invalid";


interface EmailVerificationPanelProps {
    redirect?: string;
    defaultEmail?: string;
    status: VerificationStatus;
    verificationCallbackURL: string;
    onVerificationResent: () => Promise<void>;
}


const verificationContent = {
    pending: {
        icon: MailCheck,
        badge: "Email sent",
        title: "Check your inbox",
        badgeVariant: "success" as const,
        description: "We sent a verification link to the email address used for registration.",
    },
    expired: {
        icon: ClockAlert,
        badge: "Link expired",
        title: "Request a new link",
        badgeVariant: "warning" as const,
        description: "Verification links are valid for one hour. Enter your account email and we’ll send a new one.",
    },
    invalid: {
        icon: ShieldAlert,
        badge: "Link unavailable",
        title: "That link can’t be used",
        badgeVariant: "destructive" as const,
        description: "It may be invalid or already used. Enter your account email to receive a fresh verification link.",
    },
};


export const EmailVerificationPanel = ({ status, redirect, defaultEmail, verificationCallbackURL, onVerificationResent }: EmailVerificationPanelProps) => {
    const content = verificationContent[status];
    const StatusIcon = content.icon;

    const mutation = useResendVerificationEmailMutation(verificationCallbackURL);
    const form = useForm<ForgotPassword>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: defaultEmail || "" },
    });

    const handleSubmit = (submitted: ForgotPassword) => {
        mutation.mutate(submitted, {
            onSuccess: async () => {
                form.reset();
                await onVerificationResent();
            },
        });
    };

    return (
        <Empty className="min-h-96 border bg-muted/20 px-4 py-8">
            <EmptyHeader aria-live="polite">
                <EmptyMedia variant="icon" className="size-12 rounded-full">
                    <StatusIcon aria-hidden="true"/>
                </EmptyMedia>
                <Badge variant={content.badgeVariant}>
                    {content.badge}
                </Badge>
                <EmptyTitle className="text-xl">
                    <h2>{content.title}</h2>
                </EmptyTitle>
                <EmptyDescription className="max-w-sm">
                    {content.description}
                </EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="max-w-sm gap-4">
                {status === "pending" &&
                    <p className="text-xs leading-relaxed text-muted-foreground">
                        The link is valid for one hour. Check your spam folder if it does not appear in your inbox.
                    </p>
                }
                <form className="flex w-full flex-col gap-4 text-left" onSubmit={form.handleSubmit(handleSubmit)}>
                    <FieldSet disabled={mutation.isPending}>
                        <FieldGroup>
                            <FormTextField
                                name="email"
                                type="email"
                                autoComplete="email"
                                label="Account email"
                                control={form.control}
                                disabled={mutation.isPending}
                                placeholder="john.doe@example.com"
                            />
                        </FieldGroup>
                    </FieldSet>
                    <LoadingButton
                        type="submit"
                        className="w-full"
                        isLoading={mutation.isPending}
                        icon={<RefreshCw data-icon="inline-start" aria-hidden="true"/>}
                    >
                        {mutation.isPending ? "Sending email…" : "Resend verification email"}
                    </LoadingButton>
                </form>
                <Link to="/login" search={{ redirect }} className={buttonVariants({ variant: "outline" })}>
                    Go to sign in
                </Link>
            </EmptyContent>
        </Empty>
    );
};
