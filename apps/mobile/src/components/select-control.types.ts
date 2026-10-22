export interface SelectControlProps<T extends string> {
    value: T;
    disabled?: boolean;
    onChange: (value: T) => void;
    options: readonly { value: T; label: string }[];
}
