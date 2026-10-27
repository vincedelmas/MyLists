import {useDebouncedValue} from "../../hooks/use-debounced-value";
import {useState} from "react";
import {Linking, View} from "react-native";
import {launchImageLibraryAsync} from "expo-image-picker";
import {ActionSheet} from "../../components/action-sheet";
import {AppText, Button, Cover, Field} from "../../components/ui";
import {ChoiceChips} from "../../components/choice-chips";
import type {MediaParams, MobileMedia, api} from "../../lib/api-client";
import {useMediaAction} from "./use-media-action";


type ImageInput = NonNullable<Extract<Parameters<typeof api.mediaAction>[1], { action: "cover" }>["image"]>;


export function MediaCoverSheet({ params, data, shared = false, dismiss }: { params: MediaParams; data: MobileMedia; shared?: boolean; dismiss: () => void }) {
    const mutation = useMediaAction(params);
    const [mode, setMode] = useState<"link" | "upload">("link");
    const [url, setUrl] = useState("");
    const previewUrl = useDebouncedValue(url.trim());
    const [image, setImage] = useState<{ uri: string; input: ImageInput } | null>(null);
    const [error, setError] = useState("");
    const [picking, setPicking] = useState(false);
    const pick = async () => {
        setError("");
        setPicking(true);
        try {
            const result = await launchImageLibraryAsync({
                mediaTypes: ["images"],
                allowsEditing: true,
                aspect: [2, 3],
                quality: 0.85,
                base64: true
            });
            if (result.canceled) return;
            const asset = result.assets[0];
            if (asset.base64!.length > 13_650_000) {
                setError("Image must be less than 10MB.");

                return;
            }
            setImage({
                uri: asset.uri,
                input: { data: asset.base64!, mimeType: "image/jpeg" }
            });
        }
        catch {
            setError("Couldn’t open your photos. Please try again.");
        }
        finally {
            setPicking(false);
        }
    };
    const suggested = `https://covers.openlibrary.org/b/title/${encodeURIComponent(data.media.name.trim())}-L.jpg?default=false`;

    return (
        <ActionSheet
            title={shared ? "Update this book cover" : "Custom cover"}
            error={error || mutation.error?.message}
            dismiss={dismiss}
        >
            <AppText muted>
                {shared
                    ? "Contribute a real cover for everyone. This is only available while the book uses the default cover."
                    : "Choose the cover displayed in your own list."}
            </AppText>
            <View style={{ alignItems: "center" }}>
                <Cover
                    uri={mode === "upload" && image ? image.uri : previewUrl || data.media.cover}
                    label={data.media.name}
                    style={{ width: 100, height: 150, borderRadius: 12 }}
                />
            </View>
            <ChoiceChips
                label="Cover source"
                value={mode}
                options={[
                    { value: "link", label: "Image link" },
                    { value: "upload", label: "Your photos" }
                ]}
                onChange={setMode}
            />
            {mode === "link"
                ? <Field
                    label="Image URL"
                    value={url}
                    onChangeText={setUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    editable={!mutation.isPending}
                    placeholder="https://…"
                    clearable
                />
                :
                <Button
                    secondary
                    label={image ? "Choose another photo" : "Choose a photo"}
                    pending={picking}
                    disabled={mutation.isPending}
                    onPress={() => void pick()}
                />
            }
            {params.mediaType === "books" &&
                <Button
                    secondary
                    label="Use Open Library suggestion"
                    disabled={mutation.isPending}
                    onPress={() => {
                        setMode("link");
                        setUrl(suggested);
                    }}
                />
            }
            <Button
                secondary
                label="Search Google Images"
                onPress={() => void Linking.openURL(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${data.media.name} ${data.media.byline ?? ""} cover`)}`)}
            />
            <Button
                fullWidth
                label={shared ? "Save book cover" : "Save custom cover"}
                pending={mutation.isPending}
                disabled={mode === "link" ? !url.trim() : !image}
                onPress={() => mutation.mutate({
                    ...(shared
                        ? { action: "book-cover" as const }
                        : {
                            action: "cover" as const,
                            remove: false
                        }),
                    ...(mode === "link" ? { imageUrl: url.trim() } : { image: image!.input })
                }, { onSuccess: dismiss })}
            />
            {!shared && data.tracking?.customCover &&
                <Button
                    fullWidth
                    secondary
                    label="Restore original cover"
                    disabled={mutation.isPending}
                    onPress={() => mutation.mutate({ action: "cover", remove: true }, { onSuccess: dismiss })}
                />
            }
        </ActionSheet>
    );
}
