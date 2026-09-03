import {useId} from "react";
import {cn} from "@/lib/utils/classnames";
import {Link} from "@tanstack/react-router";
import {zodResolver} from "@hookform/resolvers/zod";
import {Controller, useForm} from "react-hook-form";
import {Badge} from "@/lib/client/components/ui/badge";
import {Input} from "@/lib/client/components/ui/input";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {ForgotPassword, forgotPasswordSchema} from "@/lib/schemas";
import {Button, buttonVariants} from "@/lib/client/components/ui/button";
import {ClockAlert, MailCheck, RefreshCw, ShieldAlert} from "lucide-react";
import {Field, FieldError, FieldGroup, FieldLabel, FieldSet} from "@/lib/client/components/ui/field";
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
    const fieldId = useId();
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
                            <Controller
                                name="email"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid} data-disabled={mutation.isPending}>
                                        <FieldLabel htmlFor={`${fieldId}-verification-email`}>Account email</FieldLabel>
                                        <Input
                                            {...field}
                                            type="email"
                                            autoComplete="email"
                                            aria-invalid={fieldState.invalid}
                                            placeholder="john.doe@example.com"
                                            id={`${fieldId}-verification-email`}
                                        />
                                        <FieldError errors={[fieldState.error]}/>
                                    </Field>
                                )}
                            />
                        </FieldGroup>
                    </FieldSet>
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={mutation.isPending}
                        aria-busy={mutation.isPending}
                    >
                        {mutation.isPending
                            ? <Spinner className="text-primary-foreground" data-icon="inline-start" aria-hidden="true"/>
                            : <RefreshCw data-icon="inline-start" aria-hidden="true"/>
                        }
                        {mutation.isPending ? "Sending email…" : "Resend verification email"}
                    </Button>
                </form>
                <Link to="/login" search={{ redirect }} className={cn(buttonVariants({ variant: "outline" }))}>
                    Go to sign in
                </Link>
            </EmptyContent>
        </Empty>
    );
};
