import {useState} from "react";
import {Button, Text} from "@expo/ui";
import {colors} from "../theme";
import {DropdownMenu, DropdownMenuItem} from "@expo/ui/jetpack-compose";
import type {SelectControlProps} from "./select-control.types";

// Android's universal Picker uses a text field. Use a native menu button
// for filters instead; the surrounding Select already provides the Host.
export function SelectControl<T extends string>({value, options, onChange, disabled}: SelectControlProps<T>) {
    const [expanded, setExpanded] = useState(false);
    // Filter options can be temporarily empty while a query changes.
    const selectedLabel = options.find((option) => option.value === value)?.label ?? "";

    return (
        <DropdownMenu expanded={expanded} onDismissRequest={() => setExpanded(false)} color={colors.surface}>
            <DropdownMenu.Trigger>
                <Button
                    label={`${selectedLabel} ▾`}
                    variant="outlined"
                    disabled={disabled}
                    onPress={() => setExpanded(true)}
                />
            </DropdownMenu.Trigger>
            <DropdownMenu.Items>
                {options.map((option) =>
                    <DropdownMenuItem
                        key={option.value}
                        enabled={!disabled}
                        onClick={() => {
                            setExpanded(false);
                            onChange(option.value);
                        }}
                    >
                        <DropdownMenuItem.Text>
                            <Text textStyle={{color: option.value === value ? colors.accent : colors.text}}>
                                {option.label}
                            </Text>
                        </DropdownMenuItem.Text>
                        {option.value === value &&
                            <DropdownMenuItem.TrailingIcon>
                                <Text textStyle={{color: colors.accent}}>✓</Text>
                            </DropdownMenuItem.TrailingIcon>
                        }
                    </DropdownMenuItem>
                )}
            </DropdownMenu.Items>
        </DropdownMenu>
    );
}
