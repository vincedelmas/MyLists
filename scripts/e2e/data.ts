export const password = "BrowserTestPassword!";


export const users = {
    owner: {
        id: 1,
        name: "e2eowner",
        privacy: "private",
        email: "owner@example.invalid",
    },
    stranger: {
        id: 2,
        privacy: "public",
        name: "e2estranger",
        email: "stranger@example.invalid",
    },
    follower: {
        id: 3,
        privacy: "public",
        name: "e2efollower",
        email: "follower@example.invalid",
    },
    restricted: {
        id: 4,
        name: "e2erestricted",
        privacy: "restricted",
        email: "restricted@example.invalid",
    },
} as const;


export const movies = {
    editable: {
        id: 101,
        name: "Browser test movie",
    },
    imported: {
        id: 102,
        name: "Imported browser movie",
    },
    private: {
        id: 103,
        name: "Private movie sentinel",
    },
} as const;


export const privateCollection = {
    id: 31,
    title: "Private collection sentinel",
    description: "Private collection description sentinel",
};


export const publicCollection = {
    id: 32,
    title: "Public collection sentinel",
};


export const privateImport = {
    id: 41,
    name: "Private import row sentinel",
    reason: "Private import reason sentinel",
};
