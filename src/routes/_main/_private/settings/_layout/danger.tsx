import {Trash2} from "lucide-react";
import {useId, useState} from "react";
import {DeleteAccountForm} from "@/lib/schemas";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Input} from "@/lib/client/components/ui/input";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {handleServerFormErrors} from "@/lib/client/forms";
import {FormError} from "@/lib/client/components/forms/FormError";
import {Controller, FormProvider, useForm} from "react-hook-form";
import {accountSecurityOptions} from "@/lib/client/react-query/query-options";
import {Field, FieldError, FieldGroup, FieldLabel} from "@/lib/client/components/ui/field";
import {useDeleteAccountMutation} from "@/lib/client/react-query/query-mutations/user.mutations";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";


export const Route = createFileRoute("/_main/_private/settings/_layout/danger")({
    context: () => ({
        accountSecurityOptions,
    }),
    loader: ({ context }) => {
        return context.queryClient.ensureQueryData(context.accountSecurityOptions);
    },
    component: DangerForm,
});


function DangerForm() {
    const passwordId = useId();
    const { clearSession, signOut } = useAuth();
    const [open, setOpen] = useState(false);
    const { accountSecurityOptions } = Route.useRouteContext();
    const { hasPassword } = useSuspenseQuery(accountSecurityOptions).data;
    const deleteAccountMutation = useDeleteAccountMutation({ noErrorToast: true });
    const form = useForm<DeleteAccountForm>({
        defaultValues: {
            confirmation: "",
            currentPassword: "",
        },
    });

    const onOpenChange = (nextOpen: boolean) => {
        if (deleteAccountMutation.isPending) return;
        setOpen(nextOpen);
        form.reset();
    }

    const onSubmit = (values: DeleteAccountForm) => {
        if (deleteAccountMutation.isPending) return;

        deleteAccountMutation.mutate({
            data: hasPassword
                ? { currentPassword: values.currentPassword }
                : { confirmation: values.confirmation }
        }, {
            onError: (error) => {
                handleServerFormErrors(form, error);
            },
            onSuccess: async () => {
                form.reset();
                setOpen(false);
                try {
                    await signOut();
                }
                catch {
                    await clearSession();
                }
            }
        });
    };

    return (
        <section className="h-fit max-w-2xl rounded-xl border border-destructive/35 p-5">
            <div className="flex flex-col gap-4">
                <div>
                    <h3 className="font-medium">
                        Delete Account
                    </h3>
                    <p className="mt-1 text-sm text-destructive/90">
                        Permanently remove your account and all associated data.
                        This action is not reversible, so please continue with caution.
                    </p>
                </div>
                <Button variant="destructive" onClick={() => setOpen(true)} className="w-fit">
                    <Trash2 className="size-4"/>
                    Delete Account
                </Button>
            </div>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent showCloseButton={!deleteAccountMutation.isPending}>
                    <FormProvider {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                            <DialogHeader>
                                <DialogTitle>Delete Your Account?</DialogTitle>
                                <DialogDescription>
                                    All your data will be permanently deleted.
                                    This action cannot be undone.
                                    {hasPassword
                                        ? " Enter your current password to confirm."
                                        : " Type DELETE to confirm."
                                    }
                                </DialogDescription>
                            </DialogHeader>

                            {hasPassword ?
                                <FieldGroup>
                                    <Controller
                                        name="currentPassword"
                                        rules={{ required: "Current password is required." }}
                                        control={form.control}
                                        render={({ field, fieldState }) =>
                                            <Field data-invalid={fieldState.invalid} data-disabled={deleteAccountMutation.isPending}>
                                                <FieldLabel htmlFor={passwordId}>
                                                    Current password
                                                </FieldLabel>
                                                <Input
                                                    {...field}
                                                    id={passwordId}
                                                    type={"password"}
                                                    autoComplete="current-password"
                                                    aria-invalid={fieldState.invalid}
                                                    disabled={deleteAccountMutation.isPending}
                                                />
                                                <FieldError errors={[fieldState.error]}/>
                                            </Field>
                                        }
                                    />
                                </FieldGroup>
                                :
                                <FieldGroup>
                                    <Controller
                                        name="confirmation"
                                        control={form.control}
                                        rules={{
                                            validate: (value) =>
                                                value === "DELETE" || "Type DELETE to confirm account deletion."
                                        }}
                                        render={({ field, fieldState }) =>
                                            <Field data-invalid={fieldState.invalid} data-disabled={deleteAccountMutation.isPending}>
                                                <FieldLabel htmlFor={passwordId}>Type DELETE</FieldLabel>
                                                <Input
                                                    {...field}
                                                    id={passwordId}
                                                    autoComplete="off"
                                                    spellCheck={false}
                                                    aria-invalid={fieldState.invalid}
                                                    disabled={deleteAccountMutation.isPending}
                                                />
                                                <FieldError errors={[fieldState.error]}/>
                                            </Field>
                                        }
                                    />
                                </FieldGroup>
                            }

                            <FormError/>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    disabled={deleteAccountMutation.isPending}
                                    onClick={() => {
                                        form.reset();
                                        setOpen(false);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" variant="destructive" disabled={deleteAccountMutation.isPending}>
                                    Delete Account
                                </Button>
                            </DialogFooter>
                        </form>
                    </FormProvider>
                </DialogContent>
            </Dialog>
        </section>
    );
}
