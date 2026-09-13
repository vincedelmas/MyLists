import {AsyncLocalStorage} from "node:async_hooks";


// Keeps background request policy scoped to job, including async provider calls
export const providerRequestContext = new AsyncLocalStorage<{ isImport: boolean }>();
