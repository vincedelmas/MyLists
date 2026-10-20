const appSource = "mylists-cover-picker-app";
const extensionSource = "mylists-cover-picker-extension";


window.addEventListener("message", event => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== appSource) return;

    const message = event.data;

    if (message.type === "ping") {
        window.postMessage({source: extensionSource, type: "ready"}, location.origin);
    }

    if (message.type === "search") {
        chrome.runtime.sendMessage({
            type: "search",
            query: message.query,
            mediaKey: message.mediaKey,
            requestId: message.requestId,
        }).then((result) => {
            const response = typeof result?.ok === "boolean"
                ? result
                : {
                    ok: false,
                    error: "The cover picker did not answer search request. Reload extension in brave://extensions, then reload MyLists.",
                };

            window.postMessage({
                type: "search-result",
                source: extensionSource,
                requestId: message.requestId,
                ...response,
            }, location.origin);
        }).catch(() => {
            window.postMessage({
                ok: false,
                type: "search-result",
                source: extensionSource,
                requestId: message.requestId,
                error: "Reload MyLists to reconnect the cover picker extension.",
            }, location.origin);
        });
    }
});


chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message.type !== "cover") return;

    const onResult = (event) => {
        if (
            event.source !== window
            || event.origin !== location.origin
            || event.data?.source !== appSource
            || event.data.type !== "cover-result"
            || event.data.requestId !== message.requestId
        ) {
            return;
        }

        clearTimeout(timeout);
        window.removeEventListener("message", onResult);
        respond({ok: event.data.ok, error: event.data.error});
    };

    const timeout = setTimeout(() => {
        window.removeEventListener("message", onResult);
        respond({ok: false, error: "The cover form is closed or the search is outdated. Open the form and start a new search."});
    }, 1500);

    window.addEventListener("message", onResult);
    window.postMessage({...message, source: extensionSource}, location.origin);

    return true;
});


window.postMessage({source: extensionSource, type: "ready"}, location.origin);
