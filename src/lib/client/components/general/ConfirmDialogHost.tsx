import {Input} from "@/lib/client/components/ui/input";
import {Label} from "@/lib/client/components/ui/label";
import React, {MouseEvent, useId, useRef} from "react";
import {useConfirmState} from "@/lib/client/hooks/use-confirm";
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
    const { open, options, inputValue, setInputValue, cancel, confirm } = useConfirmState();

    if (!options) return null;

    const isDestructive = options.variant === "destructive";
    const requiresText = options?.requireText !== undefined;
    const confirmDisabled = requiresText && inputValue !== options.requireText;

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) cancel();
    }

    const handleOnConfirm = (ev: MouseEvent<HTMLButtonElement>) => {
        if (confirmDisabled) {
            ev.preventDefault();
            return;
        }

        confirm();
    }

    const handleOnOpenAutoFocus = (ev: Event) => {
        if (!requiresText) return;
        ev.preventDefault();
        inputRef.current?.focus();
    }

    return (
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
            <AlertDialogContent onOpenAutoFocus={handleOnOpenAutoFocus}>
                <AlertDialogHeader>
                    <AlertDialogTitle className={isDestructive ? "text-destructive" : undefined}>
                        {options.title}
                    </AlertDialogTitle>
                    <AlertDialogDescription className={options.description ? undefined : "sr-only"}>
                        {options.description ?? "Confirm whether you want to continue."}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {requiresText &&
                    <div className="space-y-2">
                        <Label htmlFor={inputId}>
                            Type <span className="font-medium text-foreground">{options.requireText}</span> to confirm.
                        </Label>
                        <Input
                            id={inputId}
                            data-bwignore
                            ref={inputRef}
                            autoCorrect="off"
                            autoComplete="off"
                            value={inputValue}
                            spellCheck={false}
                            autoCapitalize="none"
                            onChange={(ev) => setInputValue(ev.target.value)}
                        />
                    </div>
                }

                <AlertDialogFooter>
                    <AlertDialogCancel type="button" variant="secondary">
                        {options.cancelLabel}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        type="button"
                        onClick={handleOnConfirm}
                        disabled={confirmDisabled}
                        variant={isDestructive ? "destructive" : "emeraldy"}
                    >
                        {options.confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
