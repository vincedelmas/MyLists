export const uniqueBy = <T, Key>(items: readonly T[], getKey: (item: T) => Key, limit?: number) => {
    const seen = new Set<Key>();
    const uniqueItems: T[] = [];

    for (const item of items) {
        const key = getKey(item);
        if (seen.has(key)) continue;
        if (limit !== undefined && uniqueItems.length >= limit) break;

        seen.add(key);
        uniqueItems.push(item);
    }

    return uniqueItems;
};
