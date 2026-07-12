import {createStart} from "@tanstack/react-start";
import {csrfMiddleware} from "@/lib/server/middlewares/csrf";
import {funcErrorMiddleware, reqErrorMiddleware} from "@/lib/server/middlewares/global-error";
import {formattedErrorAdapter, unauthorizedErrorAdapter, validationErrorAdapter} from "@/lib/utils/error-classes";


export const startInstance = createStart(() => {
    return {
        defaultSsr: false,
        requestMiddleware: [csrfMiddleware, reqErrorMiddleware],
        functionMiddleware: [funcErrorMiddleware],
        serializationAdapters: [
            formattedErrorAdapter,
            validationErrorAdapter,
            unauthorizedErrorAdapter,
        ],
    }
});
