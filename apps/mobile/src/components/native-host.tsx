import {Host} from "@expo/ui";
import {colors} from "../theme";
import type {ComponentProps} from "react";


// One appearance policy for platform-native controls. Layout and behavior are still Expo UI's SwiftUI / Compose implementations.
export function NativeHost({ matchContents = { vertical: true }, ...props }: ComponentProps<typeof Host>) {
    return (
        <Host
            colorScheme="dark"
            ignoreSafeArea="all"
            seedColor={colors.accent}
            matchContents={matchContents}
            {...props}
        />
    );
}
