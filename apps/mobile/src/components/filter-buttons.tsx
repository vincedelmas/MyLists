import {Pressable, View} from "react-native";
import {AppText} from "./ui";
import {colors} from "../theme";
import {LayoutGrid} from "lucide-react-native";
import {mediaColors, mediaIcons, compareMediaTypes} from "../lib/media";
import type {MediaType} from "../lib/api-client";


export function FilterButtons<T extends string>({ value, options, onChange, label }: {
    value: T;
    options: readonly { value: T; label: string; mediaType?: MediaType; count?: number }[];
    onChange: (value: T) => void;
    label: string;
}) {
    return (
        <View
            accessibilityRole="radiogroup"
            accessibilityLabel={label}
            style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
        >
            {[...options].sort((a, b) => a.mediaType && b.mediaType ? compareMediaTypes(a.mediaType, b.mediaType) : 0).map((option) => {
                const Icon = option.mediaType ? mediaIcons[option.mediaType] : LayoutGrid;
                const color = option.mediaType ? mediaColors[option.mediaType] : colors.accent;
                const selected = option.value === value;

                return (
                    <Pressable
                        key={option.value}
                        accessibilityRole="radio"
                        accessibilityLabel={`${option.label}${option.count === undefined ? "" : ` (${option.count})`}`}
                        accessibilityState={{ checked: option.value === value }}
                        onPress={() => onChange(option.value)}
                        style={({ pressed }) => ({
                            minHeight: 52,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            flexBasis: "45%",
                            flexGrow: 1,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: selected ? color : colors.border,
                            backgroundColor: selected ? `${color}18` : colors.surface,
                            opacity: pressed ? 0.7 : 1,
                        })}
                    >
                        <Icon size={17} color={color}/>
                        <AppText
                            numberOfLines={1}
                            style={{
                                flex: 1,
                                fontSize: 12,
                                fontWeight: selected ? "600" : "400",
                                color: selected ? colors.text : colors.muted
                            }}
                        >
                            {option.label}
                        </AppText>
                        {option.count !== undefined && (
                            <View
                                style={{
                                    minWidth: 23,
                                    paddingHorizontal: 5,
                                    paddingVertical: 2,
                                    borderRadius: 5,
                                    backgroundColor: colors.secondary
                                }}
                            >
                                <AppText
                                    style={{
                                        fontSize: 11,
                                        color,
                                        textAlign: "center",
                                        fontVariant: ["tabular-nums"]
                                    }}
                                >
                                    {option.count}
                                </AppText>
                            </View>
                        )
                        }
                    </Pressable>
                );
            })
            }
        </View>
    );
}
