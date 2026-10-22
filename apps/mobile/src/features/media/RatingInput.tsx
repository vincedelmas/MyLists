import { Pressable, View } from "react-native";
import { AppText, Button, Select } from "../../components/ui";
import { Rating } from "../../components/rating";
import { FeelingIcon } from "../../components/feeling-icon";
import { feelingOptions, scoreOptions } from "../../lib/ratings";
import { colors } from "../../theme";

export function RatingInput({
    value,
    system,
    pending,
    onChange,
    label = "Your rating",
}: {
    value: number | null;
    system: "score" | "feeling";
    pending: boolean;
    label?: string;
    onChange: (value: number | null) => void;
}) {
    return (
        <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <AppText style={{ fontWeight: "600" }}>{label}</AppText>
                {value === null ? (
                    <AppText muted style={{ fontSize: 12 }}>
                        Not rated
                    </AppText>
                ) : (
                    <Rating value={value} system={system} />
                )}
            </View>
            {system === "score" ? (
                <Select
                    label="Score"
                    value={value === null ? "" : String(value)}
                    disabled={pending}
                    options={[
                        { value: "", label: "Not rated" },
                        ...scoreOptions.map((item) => ({ ...item, label: Number(item.value).toFixed(1) })),
                    ]}
                    onChange={(next) => onChange(next === "" ? null : Number(next))}
                />
            ) : (
                <>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {feelingOptions.map((item) => (
                            <Pressable
                                key={item.value}
                                accessibilityRole="radio"
                                accessibilityLabel={item.label}
                                accessibilityState={{ checked: value === Number(item.value) }}
                                disabled={pending}
                                onPress={() => onChange(Number(item.value))}
                                style={({ pressed }) => ({
                                    flexBasis: "30%",
                                    flexGrow: 1,
                                    minHeight: 52,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 4,
                                    padding: 8,
                                    borderRadius: 10,
                                    borderWidth: 1,
                                    borderColor: value === Number(item.value) ? colors.accent : colors.border,
                                    backgroundColor: value === Number(item.value) ? colors.secondary : colors.surface,
                                    opacity: pending || pressed ? 0.6 : 1,
                                })}
                            >
                                <FeelingIcon value={Number(item.value)} size={23} />
                                <AppText style={{ fontSize: 10, lineHeight: 14 }}>{item.label}</AppText>
                            </Pressable>
                        ))}
                    </View>
                    {value != null && (
                        <Button secondary label="Clear rating" disabled={pending} onPress={() => onChange(null)} />
                    )}
                </>
            )}
        </View>
    );
}
