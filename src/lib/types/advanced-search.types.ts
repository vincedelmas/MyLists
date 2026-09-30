import type {ComponentType} from "react";
import type {AdvancedSearchFilters} from "@/lib/schemas";


export interface ProviderSearchFilterProps {
    filters: AdvancedSearchFilters;
    onChange: (filters: AdvancedSearchFilters) => void;
}


export type AppliedSearchFilterChipsProps = ProviderSearchFilterProps;


export interface AdvancedSearchFilterDefinition {
    label: string;
    FilterPanel: ComponentType<ProviderSearchFilterProps>;
    AppliedFilters: ComponentType<AppliedSearchFilterChipsProps>;
    cleanFilters: (filters: AdvancedSearchFilters) => AdvancedSearchFilters;
    createFilters: (applied?: AdvancedSearchFilters) => AdvancedSearchFilters;
    validate: (query: string, filters: AdvancedSearchFilters) => string | undefined;
}
