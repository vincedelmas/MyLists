export const hasDefinedCatalogFields = (fields: Record<string, unknown>) => {
    return Object.values(fields).some((value) => value !== undefined);
}
