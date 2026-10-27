import {useState} from "react";
import {Platform, Pressable, View} from "react-native";
import DateTimePicker from "@expo/ui/community/datetime-picker";
import {CalendarDays} from "lucide-react-native";
import {dateInputValueToDate, formatDate, toDateInputValue} from "@/lib/utils/formatting/date";
import {AppText, Button} from "./ui";
import {colors} from "../theme";


export function DateField({ label, value, onChange, minimum, maximum, disabled, clearable }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    minimum?: string;
    maximum?: string;
    disabled?: boolean;
    clearable?: boolean
}) {
    const [open, setOpen] = useState(false);

    return (
        <View style={{ gap: 8 }}>
            <AppText
                muted
                style={{ fontSize: 12 }}
            >
                {label}
            </AppText>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${label}, ${value ? formatDate(value) : "Choose a date"}`}
                disabled={disabled}
                onPress={() => setOpen(true)}
                style={{
                    minHeight: 48,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: 12
                }}
            >
                <CalendarDays size={18} color={colors.accent}/>
                <AppText>
                    {value ? formatDate(value) : "Choose a date"}
                </AppText>
            </Pressable>
            {clearable && value &&
                <Button
                    secondary
                    label="Clear date"
                    disabled={disabled}
                    onPress={() => onChange("")}
                />
            }
            {open &&
                <>
                    <DateTimePicker
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        value={dateInputValueToDate(value || maximum || toDateInputValue(new Date()))}
                        minimumDate={minimum ? dateInputValueToDate(minimum) : undefined}
                        maximumDate={maximum ? dateInputValueToDate(maximum) : undefined}
                        themeVariant="dark"
                        accentColor={colors.accent}
                        onDismiss={() => setOpen(false)}
                        onValueChange={(_event, date) => {
                            onChange(toDateInputValue(date, { timeZone: "local" }));
                            if (Platform.OS !== "ios") setOpen(false);
                        }}
                    />
                    {Platform.OS === "ios" &&
                        <Button
                            label="Done"
                            onPress={() => setOpen(false)}
                        />
                    }
                </>
            }
        </View>
    );
}
