import {StyleSheet} from "react-native";
import {useState} from "react";
import {colors} from "../theme";
import {Button, Text} from "@expo/ui";
import type {SelectControlProps} from "./select-control.types";
import {DropdownMenu, DropdownMenuItem} from "@expo/ui/jetpack-compose";


export function SelectControl<T extends string>({ value, options, onChange, disabled }: SelectControlProps<T>) {
    const [expanded, setExpanded] = useState(false);
    const selectedLabel = options.find((option) => option.value === value)?.label ?? "";

    return (
        <DropdownMenu
            expanded={expanded}
            onDismissRequest={() => setExpanded(false)}
            color={colors.surface}
        >
            <DropdownMenu.Trigger>
                <Button
                    variant="outlined"
                    disabled={disabled}
                    label={`${selectedLabel} ▾`}
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
                            <Text textStyle={option.value === value ? styles.accentText : styles.optionText}>
                                {option.label}
                            </Text>
                        </DropdownMenuItem.Text>
                        {option.value === value &&
                            <DropdownMenuItem.TrailingIcon>
                                <Text textStyle={styles.accentText}>
                                    ✓
                                </Text>
                            </DropdownMenuItem.TrailingIcon>
                        }
                    </DropdownMenuItem>
                )
                }
            </DropdownMenu.Items>
        </DropdownMenu>
    );
}


const styles = StyleSheet.create({
    accentText: { color: colors.accent },
    optionText: { color: colors.text },
});
