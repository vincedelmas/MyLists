import {type ChangeEvent, type KeyboardEvent, useState} from "react";


interface NumericEditOptions {
    value: number;
    validate: (value: number) => boolean;
    onCommit: (value: number) => Promise<boolean>;
}


export const useNumericEdit = ({ value, validate, onCommit }: NumericEditOptions) => {
    const [draft, setDraft] = useState(value.toString());

    const reset = () => {
        return setDraft(value.toString());
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
        onBlur: () => void commit(),
        onChange: (ev: ChangeEvent<HTMLInputElement>) => setDraft(ev.target.value),
        onKeyDown: (ev: KeyboardEvent<HTMLInputElement>) => {
            if (ev.key === "Enter") {
                ev.preventDefault();
                ev.currentTarget.blur();
            }
        },
    };
};
