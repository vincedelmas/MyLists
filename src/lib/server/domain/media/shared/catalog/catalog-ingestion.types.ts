export type CatalogMediaInput = {
    apiId: number | string;
    name: string;
    releaseDate?: string | null;
    synopsis?: string | null;
    imageCover: string;
    locked?: boolean | null;
};


/**
 * Application boundary used by external providers to resolve and refresh
 * canonical catalog items. Implementations own transactions and reconciliation.
 */
export interface CatalogIngestionCommands<TDetails> {
    findByApiId(apiId: number | string): Promise<{ id: number; apiId: number | string } | undefined>;

    findByApiIds(apiIds: (number | string)[]): Promise<{ id: number; apiId: number | string }[]>;

    ingest(details: TDetails): Promise<number>;

    refresh(details: TDetails): Promise<boolean>;
}
