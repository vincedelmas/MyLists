import type { ComponentProps } from "react";
import { Animated } from "react-native";
import { QueryPanel } from "../../components/ui";
import { useProfileScroll } from "../../hooks/use-profile-scroll";

// Loading/error panes can still collapse the header and leave retry reachable.
export function ProfileQueryPanel<T>(props: ComponentProps<typeof QueryPanel<T>>) {
    const { scrollProps, contentContainerStyle } = useProfileScroll();
    if (props.query.data === undefined) {
        return (
            <Animated.ScrollView {...scrollProps} contentContainerStyle={contentContainerStyle}>
                <QueryPanel {...props} />
            </Animated.ScrollView>
        );
    }
    return <QueryPanel {...props} />;
}
