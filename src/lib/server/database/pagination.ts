type PaginationOptions = {
    page?: number;
    perPage?: number;
    maxPerPage?: number;
    defaultPerPage?: number;
};


type PaginationParams = {
    page: number;
    limit: number;
    offset: number;
    perPage: number;
};


type PaginatedResult<T> = {
    items: T[];
    page: number;
    total: number;
    pages: number;
    perPage: number;
};


const DEFAULT_PER_PAGE = 25;


export const resolvePagination = (options: PaginationOptions): PaginationParams => {
    const page = Math.max(1, Math.floor(options.page ?? 1));
    const defaultPerPage = options.defaultPerPage ?? DEFAULT_PER_PAGE;
    const perPage = Math.max(1, Math.floor(options.perPage ?? defaultPerPage));
    const limitedPerPage = options.maxPerPage ? Math.min(perPage, options.maxPerPage) : perPage;
    const offset = (page - 1) * limitedPerPage;

    return { page, perPage: limitedPerPage, offset, limit: limitedPerPage };
};


export const resolveSorting = <T extends string>(value: string | undefined, allowed: readonly T[], fallback: T) => {
    if (value && allowed.includes(value as T)) {
        return value as T;
    }
    return fallback;
};


export const paginate = async <T>(options: PaginationOptions & {
    getTotal: () => Promise<number> | number;
    getItems: (params: PaginationParams) => Promise<T[]>;
}): Promise<PaginatedResult<T>> => {
    const pagination = resolvePagination(options);
    const [total, items] = await Promise.all([Promise.resolve(options.getTotal()), options.getItems(pagination)]);

    return {
        items,
        total,
        page: pagination.page,
        perPage: pagination.perPage,
        pages: Math.ceil(total / pagination.perPage),
    };
};
