import {useState} from "react";
import {useIsFocused} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import {Animated, RefreshControl, View} from "react-native";
import {Row, Switch, Text as NativeText} from "@expo/ui";
import {NativeHost} from "../../components/native-host";
import {AppText, Button, Field, QueryPanel, Section} from "../../components/ui";
import {useCollapsingScroll} from "../../hooks/use-collapsing-scroll";
import {mediaEditOptions} from "../../lib/react-query/query-options/media.options";
import {useMediaEditMutation} from "../../lib/react-query/query-mutations/media.mutations";
import {editMediaDetailsSchema} from "@/lib/schemas/media-details.schema";
import type {api, MediaParams} from "../../lib/api-client";
import {colors} from "../../theme";

export function MediaEditContent({ params }: { params: MediaParams }) {
    const focused = useIsFocused();
    const query = useQuery({ ...mediaEditOptions(params), enabled: focused });
    const { scrollProps, contentContainerStyle } = useCollapsingScroll();
    return (
        <Animated.ScrollView
            {...scrollProps}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[{ padding: 16, gap: 20 }, contentContainerStyle]}
            refreshControl={
                <RefreshControl
                    tintColor={colors.accent}
                    refreshing={query.isRefetching}
                    onRefresh={() => void query.refetch()}
                />
            }
        >
            <QueryPanel query={query}>{(fields) => <MediaEditForm params={params} fields={fields}/>}</QueryPanel>
        </Animated.ScrollView>
    );
}

function MediaEditForm({ params, fields }: { params: MediaParams; fields: Awaited<ReturnType<typeof api.mediaEdit>> }) {
    const [initialValues, setInitialValues] = useState(() =>
        Object.fromEntries(
            fields.map(({ key, value }) => [key, typeof value === "boolean" ? value : String(value ?? "")]),
        ),
    );
    const [values, setValues] = useState(initialValues);
    const [error, setError] = useState("");
    const mutation = useMediaEditMutation();
    const changed = fields.filter(({ key }) => values[key] !== initialValues[key]);
    return (
        <View style={{ gap: 20 }}>
            <AppText muted>Changes affect the shared catalog for everyone.</AppText>
            <Section title="Catalog metadata">
                <View style={{ padding: 16, gap: 18 }}>
                    {fields.map(({ key }) =>
                        key === "lockStatus" ? (
                            <NativeHost key={key}>
                                <Row spacing={12}>
                                    <NativeText>Lock provider updates</NativeText>
                                    <Switch
                                        value={Boolean(values[key])}
                                        disabled={mutation.isPending}
                                        onValueChange={(value) => setValues({ ...values, [key]: value })}
                                    />
                                </Row>
                            </NativeHost>
                        ) : (
                            <Field
                                key={key}
                                label={key.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase())}
                                value={String(values[key])}
                                editable={!mutation.isPending}
                                multiline={key === "synopsis"}
                                autoCapitalize="none"
                                onChangeText={(value) => setValues({ ...values, [key]: value })}
                                placeholder={
                                    key === "genres" || key === "authors"
                                        ? "Comma-separated names"
                                        : key.toLowerCase().includes("date")
                                            ? "YYYY-MM-DD"
                                            : key === "imageCover"
                                                ? "https://…"
                                                : undefined
                                }
                            />
                        ),
                    )}
                </View>
            </Section>
            {(error || mutation.error) && (
                <AppText accessibilityRole="alert" style={{ color: colors.error }}>
                    {error || mutation.error?.message}
                </AppText>
            )}
            <Button
                label="Save catalog changes"
                pending={mutation.isPending}
                disabled={changed.length === 0}
                onPress={() => {
                    const payload = Object.fromEntries(
                        changed.map(({ key }) => [
                            key,
                            key === "genres"
                                ? String(values[key])
                                    .split(",")
                                    .map((value) => value.trim())
                                    .filter(Boolean)
                                : values[key],
                        ]),
                    );
                    const parsed = editMediaDetailsSchema.safeParse({ ...params, payload });
                    if (!parsed.success) {
                        setError(parsed.error.issues[0].message);
                        return;
                    }
                    setError("");
                    mutation.mutate(parsed.data, { onSuccess: () => setInitialValues({ ...values }) });
                }}
            />
        </View>
    );
}
