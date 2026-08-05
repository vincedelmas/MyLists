import {useRef, useState} from "react";
import {useDebounce} from "@/lib/client/hooks/use-debounce";
import {useOnClickOutside} from "@/lib/client/hooks/use-clicked-outside";


interface UseSearchLogicOptions {
    debounceMs?: number;
    onReset?: () => void;
    outsideClickEnabled?: boolean;
    resetOnOutsideClick?: boolean;
}


export function useSearchContainer({ onReset, debounceMs = 400, outsideClickEnabled = true, resetOnOutsideClick = true }: UseSearchLogicOptions = {}) {
    const [search, setSearch] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const debouncedSearch = useDebounce(search, debounceMs);
    const containerRef = useRef<HTMLDivElement>(null);

    const reset = () => {
        setSearch("");
        setIsOpen(false);
        onReset?.();
    };

    const handleInputChange = (value: string) => {
        setSearch(value);
        if (value.length > 0) {
            setIsOpen(true);
        }
    };

    const selectValue = (value: string) => {
        setSearch(value);
        setIsOpen(false);
    };

    useOnClickOutside(containerRef, () => {
        if (!outsideClickEnabled) return;
        if (resetOnOutsideClick) reset();
        else setIsOpen(false);
    });

    return {
        reset,
        search,
        isOpen,
        setIsOpen,
        selectValue,
        containerRef,
        debouncedSearch,
        setSearch: handleInputChange,
    };
}
