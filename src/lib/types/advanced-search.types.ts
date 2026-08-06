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
    createFilters: (applied?: AdvancedSearchFilters) => AdvancedSearchFilters;
    cleanFilters: (filters: AdvancedSearchFilters) => AdvancedSearchFilters;
    validate: (query: string, filters: AdvancedSearchFilters) => string | undefined;
}
