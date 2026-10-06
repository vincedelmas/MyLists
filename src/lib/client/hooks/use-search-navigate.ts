import {type ChangeEvent, useState} from "react";
import {useDebounceCallback} from "@/lib/client/hooks/use-debounce";
import {NavigateOptions, useNavigate} from "@tanstack/react-router";


type BaseSearchParams = {
    page?: number;
    search?: string;
}


type UseSearchNavigateProps = {
    search: string;
    delay?: number;
    options?: NavigateOptions;
};


export const useSearchNavigate = <T extends BaseSearchParams>({ search, delay = 400, options }: UseSearchNavigateProps) => {
    const navigate = useNavigate();
    const [input, setInput] = useState({ urlSearch: search, value: search, navigatedSearch: search });

    // Keep newer typed text when our debounced navigation arrives, reset it for external URL changes
    if (input.urlSearch !== search) {
        setInput({
            urlSearch: search,
            navigatedSearch: search,
            value: search === input.navigatedSearch ? input.value : search,
        });
    }

    const localSearch = input.value;

    const setLocalSearch = (value: string) => setInput(current => ({ ...current, value }));

    const updateFilters = (updater: Partial<T>) => {
        void navigate({ search: prev => ({ ...prev, ...updater }), replace: true, ...options });
    };

    const handleInputChange = (ev: ChangeEvent<HTMLInputElement>) => {
        const value = ev.target.value;
        setLocalSearch(value);

        if (value === "") {
            setInput(current => ({ ...current, navigatedSearch: "" }));
            updateFilters({ search: undefined, page: 1 } as Partial<T>);
        }
    };

    useDebounceCallback(localSearch, delay, () => {
        if (localSearch !== input.navigatedSearch && localSearch !== search && localSearch !== "") {
            setInput(current => ({ ...current, navigatedSearch: localSearch }));
            updateFilters({ search: localSearch, page: 1 } as Partial<T>);
        }
    });

    return { localSearch, setLocalSearch, handleInputChange, updateFilters };
};
