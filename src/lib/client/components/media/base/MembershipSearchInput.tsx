import {InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText} from "@/lib/client/components/ui/input-group";


interface MembershipSearchInputProps {
    value: string;
    disabled: boolean;
    canCreate: boolean;
    placeholder: string;
    isCreating: boolean;
    onCreate: () => void;
    onChange: (value: string) => void;
}


export const MembershipSearchInput = (props: MembershipSearchInputProps) => {
    const { value, placeholder, canCreate, disabled, isCreating, onChange, onCreate } = props;

    return (
        <InputGroup className="h-9">
            <InputGroupInput
                autoFocus
                value={value}
                disabled={disabled}
                aria-label={placeholder}
                placeholder={placeholder}
                onChange={ev => onChange(ev.target.value)}
                onKeyDown={ev => {
                    if (ev.key === "Enter" && !ev.nativeEvent.isComposing) {
                        ev.preventDefault();
                        if (canCreate && !disabled) onCreate();
                    }
                }}
            />

            <InputGroupAddon align="inline-end">
                {canCreate ?
                    <InputGroupButton variant="default" disabled={disabled} onClick={onCreate}>
                        {isCreating ? "Creating..." : "CREATE"}
                    </InputGroupButton>
                    :
                    <InputGroupText>
                        ESC
                    </InputGroupText>
                }
            </InputGroupAddon>
        </InputGroup>
    );
}
