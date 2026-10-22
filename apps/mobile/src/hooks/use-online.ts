import {useSyncExternalStore} from "react";
import {onlineManager} from "@tanstack/react-query";


const snapshot = () => onlineManager.isOnline();


export const useOnline = () => useSyncExternalStore(subscribe, snapshot);


const subscribe = (callback: () => void) => onlineManager.subscribe(callback);
