type RepoStubDefinition = {
    listTable: unknown;
};


export function createRepoStub<TDefinition extends RepoStubDefinition>(definition: TDefinition, overrides: Record<string, unknown> = {}) {
    return {
        definition,
        ...overrides,
    };
}


export function createListTableStub() {
    return { comment: {}, rating: {}, status: {} };
}
