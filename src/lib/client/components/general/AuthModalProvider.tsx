import {useAuthModal} from "@/lib/client/hooks/use-auth-modal";
import {LoginForm} from "@/lib/client/components/auth/LoginForm";
import {RegisterForm} from "@/lib/client/components/auth/RegisterForm";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";


export function AuthModalProvider() {
    const { view, isOpen, redirect, close } = useAuthModal();

    return (
        <>
            <LoginModal
                redirect={redirect}
                onOpenChange={close}
                open={isOpen && view === "login"}
            />
            <RegisterModal
                redirect={redirect}
                onOpenChange={close}
                open={isOpen && view === "register"}
            />
        </>
    );
}


interface LoginModalProps {
    open: boolean;
    redirect?: string;
    onOpenChange?: (open: boolean) => void;
}


function LoginModal({ open, redirect, onOpenChange }: LoginModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-sm:w-full w-87 bg-neutral-950">
                <DialogHeader>
                    <DialogTitle>Login to MyLists</DialogTitle>
                    <DialogDescription></DialogDescription>
                </DialogHeader>
                <LoginForm
                    redirectTo={redirect}
                    onOpenChange={onOpenChange}
                />
            </DialogContent>
        </Dialog>
    )
}


interface RegisterModalProps {
    open: boolean;
    redirect?: string;
    onOpenChange?: (open: boolean) => void;
}


function RegisterModal({ open, redirect, onOpenChange }: RegisterModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-sm:w-full w-87 bg-neutral-950">
                <DialogHeader>
                    <DialogTitle>Register to MyLists</DialogTitle>
                    <DialogDescription></DialogDescription>
                </DialogHeader>
                <RegisterForm
                    redirectTo={redirect}
                    onOpenChange={onOpenChange}
                />
            </DialogContent>
        </Dialog>
    )
}
