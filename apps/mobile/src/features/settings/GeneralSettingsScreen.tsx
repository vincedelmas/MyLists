import {CircleUserRound, Image} from "lucide-react-native";
import {Avatar} from "../../components/avatar";
import {colors} from "../../theme";
import {useState} from "react";
import {View} from "react-native";
import {useIsFocused} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import {launchImageLibraryAsync} from "expo-image-picker";
import type {MobileSettings} from "../../lib/api-client";
import {settingsOptions} from "../../lib/react-query/query-options/settings.options";
import {useSettingsMutation} from "../../lib/react-query/query-mutations/settings.mutations";
import {AppText, Button, Content, Cover, Field, Page, QueryPanel, Section, Select, uiStyles} from "../../components/ui";
import {SettingsFeedback} from "./settings-feedback";

type ImageKey = "profileImage" | "backgroundImage";

function GeneralForm({ data }: { data: MobileSettings }) {
    const mutation = useSettingsMutation();
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
        <Content>
            <Section title="Identity & Access" icon={<CircleUserRound size={18} color={colors.accent}/>} description="The name people see, and who can access your profile."><View
                style={uiStyles.padded}>
                <Field maxLength={15} label="Username" value={username} autoCorrect={false} autoCapitalize="none" editable={!mutation.isPending} onChangeText={value => {
                    setUsername(value);
                    mutation.reset();
                }}/>
                <Select value={privacy} label="Privacy" disabled={mutation.isPending} onChange={value => {
                    setPrivacy(value);
                    mutation.reset();
                }} options={[{ value: "public", label: "Public" }, { value: "restricted", label: "Restricted" }, { value: "private", label: "Private" }]}/>
                <AppText muted style={{ fontSize: 12 }}>Public: anyone. Restricted: signed-in users. Private: only you and approved followers can see your profile, lists, stats,
                    and media updates.</AppText>
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
        </Content>
    );
}

export function GeneralSettingsScreen() {
    const focused = useIsFocused();
    const query = useQuery({ ...settingsOptions, enabled: focused });
    return <Page title="General" back><QueryPanel query={query}>{data => <GeneralForm data={data}/>}</QueryPanel></Page>;
}
