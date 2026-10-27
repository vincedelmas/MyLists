import {memo} from "react";
import {StyleSheet, View} from "react-native";
import {AppText, Cover} from "./ui";
import {colors} from "../theme";


export const Avatar = memo(function Avatar({ image, name, size = 48 }: { image: string | null; name: string; size?: number }) {
    return (
        <View style={{ width: size, height: size }}>
            <Cover
                uri={image}
                label={name}
                style={{ width: size, height: size, borderRadius: size / 2 }}
            />
            {!image &&
                <View style={styles.fallback}>
                    <AppText
                        style={{ fontSize: size * 0.36, fontWeight: "600", color: colors.muted }}
                    >
                        {Array.from(name)[0].toLocaleUpperCase()}
                    </AppText>
                </View>
            }
        </View>
    );
});


const styles = StyleSheet.create({ fallback: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" } });
