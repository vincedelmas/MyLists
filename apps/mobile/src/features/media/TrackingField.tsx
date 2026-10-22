import {useState} from "react";
import {View} from "react-native";
import {Button, Field} from "../../components/ui";


interface TrackingFieldProps {
    label: string;
    initial: string;
    pending: boolean;
    numeric?: boolean;
    multiline?: boolean;
    onSave: (value: string) => void;
}


// Key this editor by the saved field value: unrelated saves preserve its draft,
// while a server change to this field replaces the old initial value.
export function TrackingField({ label, initial, pending, numeric, multiline, onSave }: TrackingFieldProps) {
    const [value, setValue] = useState(initial);

    return (
        <View style={{ gap: 10 }}>
            <Field
                label={label}
                value={value}
                editable={!pending}
                multiline={multiline}
                maxLength={multiline ? 5000 : undefined}
                keyboardType={numeric ? "decimal-pad" : "default"}
                onChangeText={(text) => setValue(numeric ? text.replace(",", ".") : text)}
            />
            <Button
                secondary={true}
                pending={pending}
                onPress={() => onSave(value)}
                label={`Save ${label.toLowerCase()}`}
                disabled={value === initial || (numeric && (!value.trim() || !Number.isFinite(Number(value)) || Number(value) < 0))}
            />
        </View>
    );
}
