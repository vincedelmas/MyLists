import {ActionSheet} from "../../components/action-sheet";
import {CircleUserRound, Globe, Image, Info, Lock, Shield} from "lucide-react-native";
import {Avatar} from "../../components/avatar";
import {colors} from "../../theme";
import {useState} from "react";
import {Pressable, View} from "react-native";
import {useIsFocused} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import {launchImageLibraryAsync} from "expo-image-picker";
import type {MobileSettings} from "../../lib/api-client";
import {settingsOptions} from "../../lib/react-query/query-options/settings.options";
import {useSettingsMutation} from "../../lib/react-query/query-mutations/settings.mutations";
import {AppText, Button, Content, Cover, Field, Page, QueryPanel, Section, uiStyles} from "../../components/ui";
import {SettingsFeedback} from "./settings-feedback";

const privacyOptions = [
    { value: "public", label: "Public", Icon: Globe, description: "Anyone can view your profile, lists, statistics and activity on the web. Mobile viewers must be signed in." },
    { value: "restricted", label: "Restricted", Icon: Shield, description: "Only signed-in users can view your profile and its content." },
    {
        value: "private",
        label: "Private",
        Icon: Lock,
        description: "Only you and approved followers can view your profile, lists, statistics and activity. Follow requests require your approval."
    },
] as const;

type ImageKey = "profileImage" | "backgroundImage";

function GeneralForm({ data }: { data: MobileSettings }) {
    const mutation = useSettingsMutation();
    const [privacyHelp, setPrivacyHelp] = useState(false);
    const [privacy, setPrivacy] = useState(data.privacy);
    const [username, setUsername] = useState(data.username);
    const [images, setImages] = useState<Partial<Record<ImageKey, { uri: string; data: string }>>>({});
    const [imageError, setImageError] = useState("");
    const [picking, setPicking] = useState(false);
    const pick = async (key: ImageKey) => {
        setImageError("");
        setPicking(true);
        try {
            const result = await launchImageLibraryAsync({
                mediaTypes: ["images"],
                allowsEditing: true,
                aspect: key === "profileImage" ? [1, 1] : [3, 1],
                quality: 0.9,
                base64: true
            });
            if (!result.canceled) {
                const image = result.assets[0];
                if (image.base64!.length > 13_650_000) {
                    setImageError("Image must be less than 10MB.");
                    return;
                }
                setImages(current => ({ ...current, [key]: { uri: image.uri, data: image.base64! } }));
                mutation.reset();
            }
        }
        catch {
            setImageError("Couldn’t open your photos. Please try again.");
        }
        finally {
            setPicking(false);
        }
    };

    return (
        <> <Content>
            <Section title="Identity & Access" icon={<CircleUserRound size={18} color={colors.accent}/>} description="The name people see, and who can access your profile."><View
                style={uiStyles.padded}>
                <Field maxLength={15} label="Username" value={username} autoCorrect={false} autoCapitalize="none" editable={!mutation.isPending} onChangeText={value => {
                    setUsername(value);
                    mutation.reset();
                }}/>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><AppText style={{ fontWeight: "600" }}>Profile
                    privacy</AppText><Pressable accessibilityRole="button" accessibilityLabel="Explain profile privacy" onPress={() => setPrivacyHelp(true)}
                                                style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}><Info size={20} color={colors.muted}/></Pressable></View>
                <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: 8 }}>{privacyOptions.map(({ value, label, Icon }) => <Pressable key={value}
                                                                                                                                                         accessibilityRole="radio"
                                                                                                                                                         accessibilityState={{
                                                                                                                                                             checked: privacy === value,
                                                                                                                                                             disabled: mutation.isPending
                                                                                                                                                         }}
                                                                                                                                                         disabled={mutation.isPending}
                                                                                                                                                         onPress={() => {
                                                                                                                                                             setPrivacy(value);
                                                                                                                                                             mutation.reset();
                                                                                                                                                         }} style={{
                    flex: 1,
                    minHeight: 80,
                    gap: 8,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: privacy === value ? colors.accent : colors.border,
                    backgroundColor: colors.background
                }}><Icon size={21} color={privacy === value ? colors.accent : colors.muted}/><AppText
                    style={{ fontSize: 12, fontWeight: privacy === value ? "600" : "400" }}>{label}</AppText></Pressable>)}</View>
            </View></Section>
            <Section title="Profile images" icon={<Image size={18} color={colors.accent}/>}><View style={uiStyles.padded}>
                <AppText muted style={{ fontSize: 12 }}>Personalize your avatar and profile backdrop.</AppText>
                <View style={{ alignItems: "center", gap: 12 }}>
                    <Avatar image={images.profileImage?.uri ?? data.image} name={data.username} size={80}/>
                    <Button fullWidth secondary label="Choose profile image" disabled={picking || mutation.isPending} onPress={() => void pick("profileImage")}/>
                </View>
                <Cover uri={images.backgroundImage?.uri ?? data.backgroundImage} style={{ width: "100%", height: 110 }}/>
                <Button fullWidth secondary label="Choose background image" disabled={picking || mutation.isPending} onPress={() => void pick("backgroundImage")}/>
            </View></Section>
            <SettingsFeedback error={imageError || mutation.error?.message} success={mutation.isSuccess && "Profile settings saved."}/>
            <Button fullWidth label="Save changes" pending={mutation.isPending} disabled={picking} onPress={() => mutation.mutate({
                section: "general", username: username.trim(), privacy,
                profileImage: images.profileImage ? { data: images.profileImage.data, mimeType: "image/jpeg" } : undefined,
                backgroundImage: images.backgroundImage ? { data: images.backgroundImage.data, mimeType: "image/jpeg" } : undefined,
            }, { onSuccess: () => setImages({}) })}/>
        </Content>{privacyHelp &&
            <ActionSheet title="Profile privacy" dismiss={() => setPrivacyHelp(false)}>{privacyOptions.map(({ value, label, Icon, description }) => <View key={value} style={{
                flexDirection: "row",
                gap: 14
            }}><Icon size={22} color={colors.accent}/><View style={{ flex: 1, gap: 6 }}><AppText style={{ fontWeight: "600" }}>{label}</AppText><AppText muted style={{
                fontSize: 13,
                lineHeight: 21
            }}>{description}</AppText></View></View>)}</ActionSheet>}</>
    );
}

export function GeneralSettingsScreen() {
    const focused = useIsFocused();
    const query = useQuery({ ...settingsOptions, enabled: focused });
    return <Page title="General" back><QueryPanel query={query}>{data => <GeneralForm data={data}/>}</QueryPanel></Page>;
}
