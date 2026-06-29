import React, {useRef, useState} from "react";
import {useDebounceCallback} from "@/lib/client/hooks/use-debounce";
import {NavigateOptions, useNavigate} from "@tanstack/react-router";


type BaseSearchParams = {
    page?: number;
    search?: string;
}


type UseSearchInputProps = {
    search: string;
    delay?: number;
    options?: NavigateOptions;
};


export const useSearchNavigate = <T extends BaseSearchParams>({ search, delay = 400, options }: UseSearchInputProps) => {
    const navigate = useNavigate();
    const lastNavigatedRef = useRef(search);
    const [localSearch, setLocalSearch] = useState(search);

    const handleInputChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
        const value = ev.target.value;
        setLocalSearch(value);

        if (value === "") {
            lastNavigatedRef.current = "";
            updateFilters({ search: undefined, page: 1 } as Partial<T>);
        }
    };

    const updateFilters = (updater: Partial<T>) => {
        void navigate({ search: prev => ({ ...prev, ...updater }), replace: true, ...options });
    };

    useDebounceCallback(localSearch, delay, () => {
        if (localSearch !== lastNavigatedRef.current && localSearch !== "") {
            lastNavigatedRef.current = localSearch;
            updateFilters({ search: localSearch, page: 1 } as Partial<T>);
        }
    });

    return { localSearch, setLocalSearch, handleInputChange, updateFilters };
};
