import {ApiProviderType} from "@/lib/utils/enums";
import {AdvancedSearchFilters} from "@/lib/schemas";


export interface AdvancedSearchDialogProps {
    query: string;
    onClear: () => void;
    provider: ApiProviderType;
    triggerVariant?: "compact" | "default";
    advancedFilters?: AdvancedSearchFilters;
    onDialogOpenChange?: (open: boolean) => void;
    onApply: (query: string, advancedFilters: AdvancedSearchFilters) => void;
}


export type ProviderAdvancedSearchDialogProps = Omit<AdvancedSearchDialogProps, "provider">;
