export const hasDefinedCatalogFields = (fields: Record<string, unknown>) => (
    Object.values(fields).some((value) => value !== undefined)
);
