import {useEffect, useState} from "react";
import {toDateInputValue} from "@/lib/utils/date-formatting";


export const useCurrentDate = () => {
    const [currentDate, setCurrentDate] = useState<string>();

    useEffect(() => {
        setCurrentDate(toDateInputValue(new Date()));
    }, []);

    return currentDate;
};


export const useNow = (delay = 1000) => {
    const [now, setNow] = useState(0);

    useEffect(() => {
        setNow(Date.now());
        const interval = setInterval(() => {
            setNow(Date.now());
        }, delay);
        return () => clearInterval(interval);
    }, [delay]);

    return now;
};
