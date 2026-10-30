import {useState} from "react";
import {Trash2} from "lucide-react";
import {DeleteAccountForm} from "@/lib/schemas";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {FormProvider, useForm} from "react-hook-form";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {handleServerFormErrors} from "@/lib/client/forms";
import {FieldGroup} from "@/lib/client/components/ui/field";
import {FormError} from "@/lib/client/components/forms/FormError";
import {FormTextField} from "@/lib/client/components/forms/FormTextField";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {accountSecurityOptions} from "@/lib/client/react-query/query-options";
import {useDeleteAccountMutation} from "@/lib/client/react-query/query-mutations/user.mutations";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";


export const Route = createFileRoute("/_main/_private/settings/_layout/danger")({
    context: () => ({
        accountSecurityOptions,
    }),
    loader: ({ context }) => {
        return context.queryClient.query({ ...context.accountSecurityOptions, staleTime: "static" });
    },
    component: DangerForm,
});


function DangerForm() {
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
                                    <FormTextField
                                        type="password"
                                        name="currentPassword"
                                        control={form.control}
                                        label="Current password"
                                        autoComplete="current-password"
                                        disabled={deleteAccountMutation.isPending}
                                        rules={{ required: "Current password is required." }}
                                    />
                                </FieldGroup>
                                :
                                <FieldGroup>
                                    <FormTextField
                                        spellCheck={false}
                                        autoComplete="off"
                                        label="Type DELETE"
                                        name="confirmation"
                                        control={form.control}
                                        disabled={deleteAccountMutation.isPending}
                                        rules={{ validate: (val) => val === "DELETE" || "Type DELETE to confirm account deletion." }}
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
                                <LoadingButton isLoading={deleteAccountMutation.isPending} type="submit" variant="destructive">
                                    Delete Account
                                </LoadingButton>
                            </DialogFooter>
                        </form>
                    </FormProvider>
                </DialogContent>
            </Dialog>
        </section>
    );
}
