import {useIsFocused} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import {View} from "react-native";
import {AppText, Content, Page, QueryPanel, Section} from "../../components/ui";
import {profileSettingsOptions} from "../../lib/react-query/query-options/settings.options";
import {useSettingsMutation} from "../../lib/react-query/query-mutations/settings.mutations";
import {SettingsFeedback} from "./settings-feedback";
import {SettingSwitch} from "../../components/setting-switch";


export function ProfileSettingsScreen() {
    const focused = useIsFocused();
    const query = useQuery({ ...profileSettingsOptions, enabled: focused });
    const mutation = useSettingsMutation();

    return (
        <Page title="Profile customization" back>
            <QueryPanel query={query}>
                {data =>
                    <Content>
                        <Section title="Continue preview">
                            <View
                                style={{ padding: 16, gap: 16 }}
                            >
                                <SettingSwitch
                                    label="Show Continue on my profile"
                                    value={data.showContinue}
                                    disabled={mutation.isPending}
                                    onChange={showContinue => mutation.mutate({ section: "profile", showContinue })}
                                />
                                <AppText
                                    muted
                                    style={{
                                        fontSize: 12,
                                        lineHeight: 18
                                    }}
                                >
                                    Show current media in your overview, for you and your visitors. Continue stays available from Lists.
                                </AppText>
                            </View>
                        </Section>
                        <SettingsFeedback
                            error={mutation.error?.message}
                            success={mutation.isSuccess && "Profile preference saved."}
                        />
                    </Content>
                }
            </QueryPanel>
        </Page>
    );
}
