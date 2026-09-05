import type {UpdateHandlerFn} from "@/lib/types/user-media.types";


export const createSimpleUpdateHandler = <K extends string>(propName: K): UpdateHandlerFn<any, any, any> => {
    return (currentState, payload) => {
        const newState = { ...currentState, [propName]: payload[propName] };
        return [newState, null];
    };
};
