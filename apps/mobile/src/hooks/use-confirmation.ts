import type {LucideIcon} from "lucide-react-native";
import {useState} from "react";

export type Confirmation = { title: string; message: string; label: string; onConfirm: () => void; icon?: LucideIcon; cancelLabel?: string; closeOnConfirm?: boolean };

export function useConfirmation() {
    const [confirmation, confirm] = useState<Confirmation | null>(null);
    return { confirmation, confirm, dismiss: () => confirm(null) };
}
