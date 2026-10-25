import {useState} from "react";
import {View} from "react-native";
import {colors} from "../../theme";
import {useIsFocused} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import type {MobileSettings} from "../../lib/api-client";
import {settingsOptions} from "../../lib/react-query/query-options/settings.options";
import {useSettingsMutation} from "../../lib/react-query/query-mutations/settings.mutations";
import {AppText, Button, Content, Field, Page, QueryPanel, Section, Select, uiStyles} from "../../components/ui";


function GeneralForm({ data }: { data: MobileSettings }) {
    const mutation = useSettingsMutation();
    const [privacy, setPrivacy] = useState(data.privacy);
    const [username, setUsername] = useState(data.username);

    return (
        <Content>
            <Section title="Profile">
                <View style={uiStyles.padded}>
                    <Field
                        maxLength={15}
                        label="Username"
                        value={username}
                        autoCorrect={false}
                        autoCapitalize="none"
                        editable={!mutation.isPending}
                        onChangeText={(value) => {
                            setUsername(value);
                            mutation.reset();
                        }}
                    />
                    <Select
                        value={privacy}
                        label="Profile visibility"
                        disabled={mutation.isPending}
                        onChange={(value) => {
                            setPrivacy(value);
                            mutation.reset();
                        }}
                        options={[
                            { value: "public", label: "Public" },
                            { value: "restricted", label: "Signed-in users" },
                            { value: "private", label: "Private · accepted followers" },
                        ]}
                    />
                    <AppText muted>
                        Public profiles are visible to everyone. Restricted profiles require sign-in. Private profile
                        content is visible to you and accepted followers.
                    </AppText>
                </View>
            </Section>
            {mutation.error &&
                <AppText accessibilityRole="alert" style={{ color: colors.error }}>
                    {mutation.error.message}
                </AppText>
            }

            {mutation.isSuccess &&
                <AppText accessibilityRole="alert" style={{ color: colors.accent }}>
                    Profile settings saved.
                </AppText>
            }
            <Button
                label="Save changes"
                pending={mutation.isPending}
                onPress={() => mutation.mutate({ section: "general", username: username.trim(), privacy })}
            />
        </Content>
    );
}


export function GeneralSettingsScreen() {
    const focused = useIsFocused();
    const query = useQuery({ ...settingsOptions, enabled: focused });

    return (
        <Page title="General settings" back>
            <QueryPanel query={query}>
                {(data) => <GeneralForm data={data}/>}
            </QueryPanel>
        </Page>
    );
}
