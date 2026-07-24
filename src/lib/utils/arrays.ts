export const splitIntoColumns = <T>(array: T[], columnCount: number) => {
    const size = array.length;
    if (size === 0) return Array.from({ length: columnCount }, () => []);

    const remainder = size % columnCount;
    const partSize = Math.floor(size / columnCount);

    let start = 0;
    return Array.from({ length: columnCount }, (_, i) => {
        const end = start + partSize + (i < remainder ? 1 : 0);
        const slice = array.slice(start, end);
        start = end;

        return slice;
    });
};


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
