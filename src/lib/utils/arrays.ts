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
