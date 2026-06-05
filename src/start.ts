import {createCsrfMiddleware, createStart} from "@tanstack/react-start";
import {funcErrorMiddleware, reqErrorMiddleware} from "@/lib/server/middlewares/global-error";
import {formattedErrorAdapter, formZodErrorAdapter, unauthorizedErrorAdapter} from "@/lib/utils/error-classes";


const csrfMiddleware = createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === "serverFn" });


export const startInstance = createStart(() => {
    return {
        defaultSsr: false,
        requestMiddleware: [csrfMiddleware, reqErrorMiddleware],
        functionMiddleware: [funcErrorMiddleware],
        serializationAdapters: [
            formZodErrorAdapter,
            formattedErrorAdapter,
            unauthorizedErrorAdapter,
        ],
    }
});
