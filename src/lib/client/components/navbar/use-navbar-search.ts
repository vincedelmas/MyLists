import {useRef, useState} from "react";
import {useDebounce} from "@/lib/client/hooks/use-debounce";
import {useOnClickOutside} from "@/lib/client/hooks/use-clicked-outside";


export function useNavbarSearch(onReset: () => void) {
    const [search, setSearch] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const debouncedSearch = useDebounce(search, 400);
    const containerRef = useRef<HTMLDivElement>(null);

    const reset = () => {
        setSearch("");
        setIsOpen(false);
        onReset();
    };

    const handleInputChange = (value: string) => {
        setSearch(value);
        if (value.length > 0) {
            setIsOpen(true);
        }
    };

    useOnClickOutside(containerRef, () => setIsOpen(false));

    return {
        reset,
        search,
        isOpen,
        setIsOpen,
        containerRef,
        debouncedSearch,
        setSearch: handleInputChange,
    };
}
