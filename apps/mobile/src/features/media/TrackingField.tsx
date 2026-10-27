import {COMMENT_MAX_LENGTH} from "@/lib/utils/constants";
import {useState} from "react";
import {View} from "react-native";
import {Button, Field} from "../../components/ui";

interface TrackingFieldProps {
    label: string;
    initial: string;
    pending: boolean;
    numeric?: boolean;
    allowDecimals?: boolean;
    multiline?: boolean;
    onSave: (value: string) => void;
}

// Key this editor by the saved field value: unrelated saves preserve its draft,
// while a server change to this field replaces the old initial value.
export function TrackingField({
                                  label,
                                  initial,
                                  pending,
                                  numeric,
                                  allowDecimals = false,
                                  multiline,
                                  onSave,
                              }: TrackingFieldProps) {
    const [value, setValue] = useState(initial);

    return (
        <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
                {numeric && (
                    <Button
                        label="−1"
                        secondary
                        disabled={pending || !Number.isFinite(Number(value)) || Number(value) < 1}
                        onPress={() => setValue(String(Number(value) - 1))}
                    />
                )}
                <View style={{ flex: 1 }}>
                    <Field
                        label={label}
                        value={value}
                        editable={!pending}
                        multiline={multiline}
                        maxLength={multiline ? COMMENT_MAX_LENGTH : undefined}
                        keyboardType={numeric ? (allowDecimals ? "decimal-pad" : "number-pad") : "default"}
                        onChangeText={(text) => setValue(numeric ? text.replace(",", ".") : text)}
                    />
                </View>
                {numeric && (
                    <Button
                        label="+1"
                        secondary
                        disabled={pending || !Number.isFinite(Number(value))}
                        onPress={() => setValue(String(Number(value) + 1))}
                    />
                )}
            </View>
            {value !== initial && (
                <Button
                    secondary={true}
                    pending={pending}
                    onPress={() => onSave(value)}
                    label={`Save ${label.toLowerCase()}`}
                    disabled={
                        value === initial ||
                        (numeric &&
                            (!value.trim() ||
                                !Number.isFinite(Number(value)) ||
                                Number(value) < 0 ||
                                (!allowDecimals && !Number.isInteger(Number(value)))))
                    }
                />
            )}
        </View>
    );
}
