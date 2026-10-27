import {BottomSheet, RNHostView} from "@expo/ui";
import {View, useWindowDimensions} from "react-native";
import type {ComponentProps} from "react";
import {NativeHost} from "../../components/native-host";
import {FilterValues} from "./filter-values";


export function FilterValuesSheet(props: ComponentProps<typeof FilterValues>) {
    const { width, height } = useWindowDimensions();

    return (
        <NativeHost>
            <BottomSheet
                isPresented
                onDismiss={props.close}
                snapPoints={["full"]}
                contentPadding={0}
            >
                <RNHostView matchContents={{ vertical: true }}>
                    <View style={{ width: width - 32, height: height * 0.72 }}>
                        <FilterValues {...props}/>
                    </View>
                </RNHostView>
            </BottomSheet>
        </NativeHost>
    );
}
