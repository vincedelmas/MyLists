import {useEffect, useState} from "react";
import {toDateInputValue} from "@/lib/utils/date-formatting";


export const useCurrentDate = () => {
    const [currentDate] = useState(() => toDateInputValue(new Date()));
    return currentDate;
};


export const useNow = (delay = 1000) => {
    const [now, setNow] = useState(Date.now);

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, delay);
        return () => clearInterval(interval);
    }, [delay]);

    return now;
};
