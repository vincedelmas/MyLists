import type {ReactNode} from "react";
import {Store, useSelector} from "@tanstack/react-store";


export interface ConfirmOptions {
    title: ReactNode;
    content?: ReactNode;
    requireText?: string;
    cancelLabel?: ReactNode;
    description?: ReactNode;
    confirmLabel?: ReactNode;
    onConfirm?: () => Promise<unknown>;
    variant?: "default" | "destructive";
}


interface ConfirmState {
    open: boolean;
    pending: boolean;
    inputValue: string;
    options: ConfirmOptions | null;
}


const initialState: ConfirmState = {
    open: false,
    options: null,
    pending: false,
    inputValue: "",
};


const confirmStore = new Store<ConfirmState>(initialState);


let pendingResolve: ((confirmed: boolean) => void) | null = null;


const settleConfirm = (confirmed: boolean) => {
    const resolve = pendingResolve;

    // AlertDialogAction/Cancel and onOpenChange may both call settle
    if (!resolve) return;

    pendingResolve = null;

    // Preserve options and input during closing animation
    confirmStore.setState((state) => ({ ...state, open: false, pending: false }));

    resolve(confirmed);
};


export const requestConfirm = (options: ConfirmOptions) => {
    if (pendingResolve) return Promise.resolve(false);

    return new Promise<boolean>((resolve) => {
        pendingResolve = resolve;

        confirmStore.setState(() => ({
            open: true,
            pending: false,
            inputValue: "",
            options: {
                variant: "default",
                cancelLabel: "Cancel",
                confirmLabel: "Confirm",
                ...options,
            },
        }));
    });
};


const confirmActions = {
    request: requestConfirm,

    confirm: async () => {
        const { pending, options } = confirmStore.state;

        if (pending) return;
        if (!options?.onConfirm) return settleConfirm(true);

        confirmStore.setState(state => ({ ...state, pending: true }));

        try {
            await options.onConfirm();
            settleConfirm(true);
        }
        catch {
            // Mutation error feedback owned by caller, leave dialog open for retry
            confirmStore.setState(state => ({ ...state, pending: false }));
        }
    },

    cancel: () => {
        if (!confirmStore.state.pending) {
            settleConfirm(false);
        }
    },

    setInputValue: (inputValue: string) => {
        return confirmStore.setState(state => ({ ...state, inputValue }));
    },
};


export const useConfirm = () => {
    return requestConfirm;
}


export function useConfirmState() {
    const state = useSelector(confirmStore, (currentState) => currentState);

    return {
        ...state,
        cancel: confirmActions.cancel,
        confirm: confirmActions.confirm,
        setInputValue: confirmActions.setInputValue,
    };
}
