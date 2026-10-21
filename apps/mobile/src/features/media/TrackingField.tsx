import {useState} from "react";
import {View} from "react-native";
import {Button, Field} from "../../components/ui";

// Key this editor by the saved field value: unrelated saves preserve its draft,
// while a server change to this field replaces the old initial value.
export function TrackingField({
    label,
    initial,
    pending,
    numeric,
    multiline,
    onSave,
}: {
    label: string;
    initial: string;
    pending: boolean;
    numeric?: boolean;
    multiline?: boolean;
    onSave: (value: string) => void;
}) {
    const [value, setValue] = useState(initial);
    return (
        <View style={{gap: 10}}>
            <Field
                label={label}
                value={value}
                onChangeText={(text) => setValue(numeric ? text.replace(",", ".") : text)}
                editable={!pending}
                keyboardType={numeric ? "decimal-pad" : "default"}
                multiline={multiline}
                maxLength={multiline ? 5000 : undefined}
            />
            <Button
                label={`Save ${label.toLowerCase()}`}
                pending={pending}
                disabled={
                    value === initial ||
                    (numeric && (!value.trim() || !Number.isFinite(Number(value)) || Number(value) < 0))
                }
                onPress={() => onSave(value)}
                secondary
            />
        </View>
    );
}
