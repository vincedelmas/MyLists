import {useEffect, useEffectEvent, useState} from "react";


export const useDebounceCallback = (value: unknown, delay: number, callback: () => void) => {
    const onDebounced = useEffectEvent(callback);

    useEffect(() => {
        if (value === undefined || value === null || value === "") return;
        const timer = setTimeout(() => onDebounced(), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
};


export const useDebounce = <T>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
};
