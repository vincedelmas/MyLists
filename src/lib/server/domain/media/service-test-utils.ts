type RepoStubConfig = {
    listTable: unknown;
};


const unavailableRepoMethod = () => {
    throw new Error("This repository method is not available in this service unit test");
};


export function createRepoStub<TConfig extends RepoStubConfig>(config: TConfig, overrides: Record<string, unknown> = {}) {
    return {
        config,
        countAchievementCte: unavailableRepoMethod,
        getActorAchievementCte: unavailableRepoMethod,
        getAuthorsAchievementCte: unavailableRepoMethod,
        getNetworkAchievementCte: unavailableRepoMethod,
        getCompanyAchievementCte: unavailableRepoMethod,
        getDirectorAchievementCte: unavailableRepoMethod,
        getDurationAchievementCte: unavailableRepoMethod,
        getGameModeAchievementCte: unavailableRepoMethod,
        getLanguageAchievementCte: unavailableRepoMethod,
        getPlatformAchievementCte: unavailableRepoMethod,
        getTimeSpentAchievementCte: unavailableRepoMethod,
        getChaptersAchievementsCte: unavailableRepoMethod,
        getPublishersAchievementCte: unavailableRepoMethod,
        specificGenreAchievementCte: unavailableRepoMethod,
        getPerspectiveAchievementCte: unavailableRepoMethod,
        getSpecificPlatformAchievementCte: unavailableRepoMethod,
        ...overrides,
    };
}


export function createListTableStub() {
    return { comment: {}, rating: {}, status: {} };
}
