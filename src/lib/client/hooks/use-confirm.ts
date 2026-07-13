import type {ReactNode} from "react";
import {Store, useSelector} from "@tanstack/react-store";


export interface ConfirmOptions {
    title: ReactNode;
    requireText?: string;
    cancelLabel?: ReactNode;
    description?: ReactNode;
    confirmLabel?: ReactNode;
    variant?: "default" | "destructive";
}


interface ConfirmState {
    open: boolean;
    inputValue: string;
    options: ConfirmOptions | null;
}


const initialState: ConfirmState = {
    open: false,
    options: null,
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
    confirmStore.setState((state) => ({ ...state, open: false }));
    resolve(confirmed);
};


export const requestConfirm = (options: ConfirmOptions) => {
    if (pendingResolve) return Promise.resolve(false);

    return new Promise<boolean>((resolve) => {
        pendingResolve = resolve;

        confirmStore.setState(() => ({
            open: true,
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
    confirm: () => settleConfirm(true),
    cancel: () => settleConfirm(false),
    setInputValue: (inputValue: string) => confirmStore.setState(state => ({ ...state, inputValue })),
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
