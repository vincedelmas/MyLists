import {AsyncLocalStorage} from "node:async_hooks";


// Keeps background request policy scoped to the job, including asynchronous provider calls.
export const providerRequestContext = new AsyncLocalStorage<{ isImport: boolean }>();
