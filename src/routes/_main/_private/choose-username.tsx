import {useId} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";
import {AtSign, BadgeCheck, UserRoundCheck} from "lucide-react";
import {FormError} from "@/lib/client/components/forms/FormError";
import {Controller, FormProvider, useForm} from "react-hook-form";
import {authOptions} from "@/lib/client/react-query/query-options";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {useQueryClient, useSuspenseQuery} from "@tanstack/react-query";
import {OAuthUsername, oauthUsernameSchema, oauthUsernameSearchSchema} from "@/lib/schemas";
import {createFileRoute, redirect, useRouteContext, useRouter} from "@tanstack/react-router";
import {useOAuthUsernameMutation} from "@/lib/client/react-query/query-mutations/auth.mutations";
import {Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSet} from "@/lib/client/components/ui/field";


export const Route = createFileRoute("/_main/_private/choose-username")({
    validateSearch: oauthUsernameSearchSchema,
    beforeLoad: ({ context: { queryClient } }) => {
        const currentUser = queryClient.getQueryData(authOptions.queryKey);
        if (!currentUser?.usernameConfigured) return;

        throw redirect({
            replace: true,
            to: "/profile/$username",
            params: { username: currentUser.name },
        });
    },
    component: ChooseUsernamePage,
});


function ChooseUsernamePage() {
    const { authQueryOptions } = useRouteContext({ from: "__root__" });

    const fieldId = useId();
    const router = useRouter();
    const navigate = Route.useNavigate();
    const queryClient = useQueryClient();
    const { redirect } = Route.useSearch();

    const usernameMutation = useOAuthUsernameMutation();
    const currentUser = useSuspenseQuery(authQueryOptions).data!;

    const form = useForm<OAuthUsername>({
        resolver: zodResolver(oauthUsernameSchema),
        shouldFocusError: false,
        defaultValues: { username: "" },
    });

    const handleSubmit = (submitted: OAuthUsername) => {
        form.clearErrors("root");

        usernameMutation.mutate(submitted, {
            onError: (error) => {
                handleServerFormErrors(form, error);
            },
            onSuccess: async () => {
                const updatedUser = await queryClient.fetchQuery({ ...authQueryOptions, staleTime: 0 });
                if (!updatedUser) return;

                await navigate({ href: redirect || `/profile/${encodeURIComponent(updatedUser.name)}`, replace: true });
                await router.invalidate();
                await queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== authQueryOptions.queryKey[0] });
            },
        });
    };

    return (
        <PageTitle title="Choose your username" onlyHelmet>
            <div className="mb-8 flex flex-col pt-8">
                <PageHeader
                    asideIcon={BadgeCheck}
                    eyebrow="One last step"
                    asideLabel="Signed in as"
                    eyebrowIcon={UserRoundCheck}
                    title="Make the account yours"
                    asideValue={currentUser.email}
                    description="Your social account got you signed in. Now choose the unique username people will use to find your profile."
                />

                <section className="relative mt-10 w-full max-w-md self-center overflow-hidden rounded-xl border p-5 shadow-xs sm:p-6">
                    <div
                        aria-hidden="true"
                        className="absolute -top-16 -right-14 size-40 rounded-full border border-brand/20 bg-brand/5"
                    />
                    <div className="relative">
                        <div className="mb-5 flex size-11 items-center justify-center rounded-full border bg-muted/50 text-brand">
                            <AtSign className="size-5" aria-hidden="true"/>
                        </div>
                        <h2 className="text-xl font-semibold tracking-tight">
                            Claim your profile name
                        </h2>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            This replaces the temporary name created during social sign-in. You can change it later in settings.
                        </p>

                        <FormProvider {...form}>
                            <form className="mt-6 flex flex-col gap-4" onSubmit={form.handleSubmit(handleSubmit)}>
                                <FieldSet disabled={usernameMutation.isPending}>
                                    <FieldGroup>
                                        <Controller
                                            name="username"
                                            control={form.control}
                                            render={({ field, fieldState }) => (
                                                <Field data-invalid={fieldState.invalid} data-disabled={usernameMutation.isPending}>
                                                    <FieldLabel htmlFor={`${fieldId}-username`}>Username</FieldLabel>
                                                    <Input
                                                        {...field}
                                                        autoFocus={true}
                                                        autoComplete="username"
                                                        id={`${fieldId}-username`}
                                                        placeholder="your_username"
                                                        aria-invalid={fieldState.invalid}
                                                    />
                                                    <FieldDescription>
                                                        3–15 characters. Letters, numbers, underscores, and hyphens only.
                                                    </FieldDescription>
                                                    <FieldError errors={[fieldState.error]}/>
                                                </Field>
                                            )}
                                        />
                                    </FieldGroup>
                                </FieldSet>
                                <FormError/>
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={usernameMutation.isPending}
                                    aria-busy={usernameMutation.isPending}
                                >
                                    {usernameMutation.isPending &&
                                        <Spinner
                                            aria-hidden="true"
                                            data-icon="inline-start"
                                            className="text-primary-foreground"
                                        />
                                    }
                                    {usernameMutation.isPending
                                        ? "Saving username…"
                                        : "Continue to MyLists"
                                    }
                                </Button>
                            </form>
                        </FormProvider>
                    </div>
                </section>
            </div>
        </PageTitle>
    );
}
