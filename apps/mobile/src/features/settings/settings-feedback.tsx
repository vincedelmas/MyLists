import {AppText} from "../../components/ui";
import {colors} from "../../theme";

export function SettingsFeedback({ error, success }: { error?: string | null; success?: string | false }) {
    if (!error && !success) return null;
    return <AppText accessibilityRole="alert" style={{ color: error ? colors.error : colors.accent }}>{error || success}</AppText>;
}
