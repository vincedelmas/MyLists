import {Input} from "@/lib/client/components/ui/input";
import React, {MouseEvent, useId, useRef} from "react";
import {useConfirmState} from "@/lib/client/hooks/use-confirm";
import {Field, FieldLabel} from "@/lib/client/components/ui/field";
import {LoadingButton} from "@/lib/client/components/general/LoadingButton";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/lib/client/components/ui/alert-dialog";


export function ConfirmDialogHost() {
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const { open, pending, options, inputValue, setInputValue, cancel, confirm } = useConfirmState();

    if (!options) return null;

    const isDestructive = options.variant === "destructive";
    const requiresText = options?.requireText !== undefined;
    const confirmDisabled = requiresText && inputValue !== options.requireText;

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) cancel();
    }

    const handleOnConfirm = (ev: MouseEvent<HTMLButtonElement>) => {
        ev.preventDefault();
        if (confirmDisabled || pending) return;
        void confirm();
    }

    return (
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
            <AlertDialogContent initialFocus={() => requiresText ? inputRef.current : true}>
                <AlertDialogHeader>
                    <AlertDialogTitle className={isDestructive ? "text-destructive" : undefined}>
                        {options.title}
                    </AlertDialogTitle>
                    <AlertDialogDescription className={options.description ? undefined : "sr-only"}>
                        {options.description ?? "Confirm whether you want to continue."}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {options.content}

                {requiresText &&
                    <Field>
                        <FieldLabel htmlFor={inputId}>
                            Type <span className="font-medium text-foreground">{options.requireText}</span> to confirm.
                        </FieldLabel>
                        <Input
                            id={inputId}
                            data-bwignore
                            ref={inputRef}
                            autoCorrect="off"
                            disabled={pending}
                            autoComplete="off"
                            value={inputValue}
                            spellCheck={false}
                            autoCapitalize="none"
                            onChange={(ev) => setInputValue(ev.target.value)}
                        />
                    </Field>
                }

                <AlertDialogFooter>
                    <AlertDialogCancel type="button" variant="secondary" disabled={pending}>
                        {options.cancelLabel}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        type="button"
                        onClick={handleOnConfirm}
                        disabled={confirmDisabled}
                        render={<LoadingButton isLoading={pending}/>}
                        variant={isDestructive ? "destructive" : "default"}
                    >
                        {options.confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
