const menuId = "mylists-use-cover";


chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: menuId,
        contexts: ["image"],
        title: "Use as MyLists cover",
        targetUrlPatterns: ["http://*/*", "https://*/*"],
    });
});


chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message.type !== "search") return;

    if (!sender.tab || sender.frameId !== 0) {
        respond({ok: false, error: "Start the cover search from the main MyLists page."});
        return;
    }

    (async () => {
        // MessageSender.url keeps the document's initial URL across client-side navigation.
        const sourceTab = await chrome.tabs.get(sender.tab.id);
        const source = new URL(sourceTab.url);
        const allowed = source.origin === "https://mylists.info"
            || (source.protocol === "http:" && ["localhost", "127.0.0.1"].includes(source.hostname));

        const coverPage = source.pathname === "/admin/missing-covers"
            || /^\/details\/(?:edit\/)?(?:books|movies|series|anime|games|manga)\/[1-9]\d*\/?$/.test(source.pathname);

        if (!allowed || !coverPage) {
            respond({
                ok: false,
                error: `Cover searches not enabled for ${source.origin}${source.pathname}. Check extension supported MyLists addresses.`
            });

            return;
        }

        if (
            typeof message.query !== "string"
            || !message.query.trim()
            || typeof message.requestId !== "string"
            || typeof message.mediaKey !== "string"
        ) {
            respond({
                ok: false,
                error: "The cover search request is incomplete. Reload MyLists and try again."
            });

            return;
        }

        const url = new URL("https://www.google.com/search");

        url.searchParams.set("tbm", "isch");
        url.searchParams.set("q", message.query);

        const tab = await chrome.tabs.create({url: url.href, openerTabId: sender.tab.id, windowId: sourceTab.windowId});

        await chrome.storage.session.set({
            [`search:${tab.id}`]: {
                sourceUrl: sourceTab.url,
                sourceTabId: sender.tab.id,
                mediaKey: message.mediaKey,
                requestId: message.requestId,
            },
        });

        await chrome.action.setBadgeText({text: ""});
        respond({ok: true});
    })().catch((error) => {
        return respond({ok: false, error: `Could not open the cover search: ${error.message}`})
    });

    return true;
});


chrome.tabs.onCreated.addListener(async (tab) => {
    if (tab.openerTabId === undefined) return;

    const parent = (await chrome.storage.session.get(`search:${tab.openerTabId}`))[`search:${tab.openerTabId}`];
    if (parent) {
        await chrome.storage.session.set({[`search:${tab.id}`]: parent});
    }
});


chrome.tabs.onRemoved.addListener(tabId => {
    void chrome.storage.session.remove(`search:${tabId}`);
});


chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== menuId || !tab) return;

    (async () => {
        const search = (await chrome.storage.session.get(`search:${tab.id}`))[`search:${tab.id}`];
        if (!search) {
            throw new Error("Start a search from a MyLists cover form first.");
        }

        const image = new URL(info.srcUrl);
        if (!["http:", "https:"].includes(image.protocol)) {
            throw new Error("Choose an image with an HTTP or HTTPS address.");
        }

        const sourceTab = await chrome.tabs.get(search.sourceTabId);
        if (sourceTab.url !== search.sourceUrl) {
            throw new Error("The MyLists page has changed. Start a new cover search.");
        }

        const result = await chrome.tabs.sendMessage(search.sourceTabId, {
            type: "cover",
            imageUrl: image.href,
            mediaKey: search.mediaKey,
            requestId: search.requestId,
        });

        await chrome.tabs.update(search.sourceTabId, {active: true});
        await chrome.windows.update(sourceTab.windowId, {focused: true});

        if (!result?.ok) {
            throw new Error(result?.error || "The cover was not accepted. Start a new search from MyLists.");
        }

        await chrome.action.setBadgeText({text: ""});
        await chrome.action.setTitle({title: "MyLists Cover Picker"});
    })().catch(async (error) => {
        await chrome.action.setBadgeText({text: "!"});
        await chrome.action.setTitle({title: `MyLists Cover Picker: ${error.message}`});
    });
});
