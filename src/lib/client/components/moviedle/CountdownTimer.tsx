import {useEffect, useState} from "react";


const calculateTimeLeft = () => {
    const now = new Date();
    const nextMidnight = new Date().setUTCHours(24, 0, 0, 0);
    const difference = (nextMidnight - now.getTime());

    const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((difference / 1000 / 60) % 60);
    const seconds = Math.floor((difference / 1000) % 60);

    return { hours, minutes, seconds };
};


export const CountdownTimer = () => {
    const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft());

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <span className="font-medium text-app-accent mt-0.5">
            {timeLeft.hours.toString().padStart(2, "0")}:
            {timeLeft.minutes.toString().padStart(2, "0")}:
            {timeLeft.seconds.toString().padStart(2, "0")}
        </span>
    );
};
