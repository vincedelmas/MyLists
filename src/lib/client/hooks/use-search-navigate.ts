import {type ChangeEvent, useState} from "react";
import {useDebounceCallback} from "@/lib/client/hooks/use-debounce";
import {NavigateOptions, useNavigate} from "@tanstack/react-router";


type BaseSearchParams = {
    page?: number;
    search?: string;
}


type UseSearchNavigateOptions<T extends BaseSearchParams> = NavigateOptions & {
    delay?: number;
    resetFilters?: Partial<T>;
};


export const useSearchNavigate = <T extends BaseSearchParams>(filters: T, { delay = 400, resetFilters, ...options }: UseSearchNavigateOptions<T> = {}) => {
    const navigate = useNavigate();
    const search = filters.search ?? "";
    const [input, setInput] = useState({
        value: search,
        urlSearch: search,
        navigatedSearch: search,
    });

    // Keep newer typed text when our debounced nav arrives, reset for external URL changes
    if (input.urlSearch !== search) {
        setInput({
            urlSearch: search,
            navigatedSearch: search,
            value: search === input.navigatedSearch ? input.value : search,
        });
    }

    const localSearch = input.value;

    const setLocalSearch = (value: string) => {
        setInput(curr => ({ ...curr, value }));
    }

    const updateFilters = (updater: Partial<T>) => {
        if ("search" in updater) {
            const value = updater.search ?? "";
            setInput(curr => ({ ...curr, value, navigatedSearch: value }));
        }

        void navigate({ search: prev => ({ ...prev, ...updater }), replace: true, ...options });
    };

    const handleInputChange = (ev: ChangeEvent<HTMLInputElement>) => {
        const value = ev.target.value;
        setLocalSearch(value);

        if (value === "") {
            updateFilters({ ...resetFilters, search: undefined, page: 1 } as Partial<T>);
        }
    };

    useDebounceCallback(localSearch, delay, () => {
        if (localSearch !== input.navigatedSearch && localSearch !== search && localSearch !== "") {
            updateFilters({ ...resetFilters, search: localSearch, page: 1 } as Partial<T>);
        }
    });

    return {
        localSearch,
        updateFilters,
        setLocalSearch,
        handleInputChange,
    };
};
