import {Picker} from "@expo/ui";
import type {SelectControlProps} from "./select-control.types";

// iOS keeps SwiftUI's native menu picker.
export function SelectControl<T extends string>({value, options, onChange, disabled}: SelectControlProps<T>) {
    return (
        <Picker selectedValue={value} onValueChange={onChange} enabled={!disabled}>
            {options.map((option) =>
                <Picker.Item key={option.value} value={option.value} label={option.label}/>
            )}
        </Picker>
    );
}
