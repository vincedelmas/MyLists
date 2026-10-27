import {Field} from "./ui";
import {colors} from "../theme";
import type {ComponentProps} from "react";
import {Search} from "lucide-react-native";


export function SearchField(props: ComponentProps<typeof Field>) {
    return (
        <Field
            {...props}
            hideLabel={true}
            clearable={true}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType={props.returnKeyType ?? "search"}
            textStyle={{ ...props.textStyle, fontSize: 16 }}
            leadingIcon={props.leadingIcon ?? <Search size={20} color={colors.muted}/>}
            style={{ ...props.style, borderRadius: 18, backgroundColor: colors.surface, height: 50 }}
        />
    );
}
