import {type ChangeEvent, type KeyboardEvent, useState} from "react";


interface NumericEditOptions {
    value: number;
    validate: (value: number) => boolean;
    onCommit: (value: number) => Promise<boolean>;
}


export const useNumericEdit = ({ value, validate, onCommit }: NumericEditOptions) => {
    const [input, setInput] = useState({ value, draft: value.toString(), editing: false });

    if (input.value !== value) {
        setInput({ ...input, value, draft: input.editing ? input.draft : value.toString() });
    }

    const draft = input.draft;

    const reset = () => {
        setInput(current => ({ ...current, draft: current.value.toString() }));
    }

    const commit = async () => {
        const parsed = Number(draft);

        if (draft.trim() === "" || !Number.isFinite(parsed) || !validate(parsed) || parsed === value) {
            reset();
            return;
        }

        try {
            if (!await onCommit(parsed)) reset();
        }
        catch {
            reset();
        }
    };

    return {
        value: draft,
        onFocus: () => setInput(current => ({ ...current, editing: true })),
        onBlur: () => {
            setInput(current => ({ ...current, editing: false }));
            void commit();
        },
        onChange: (ev: ChangeEvent<HTMLInputElement>) => {
            const draft = ev.target.value;
            setInput(current => ({ ...current, draft }));
        },
        onKeyDown: (ev: KeyboardEvent<HTMLInputElement>) => {
            if (ev.key === "Enter") {
                ev.preventDefault();
                ev.currentTarget.blur();
            }
        },
    };
};
