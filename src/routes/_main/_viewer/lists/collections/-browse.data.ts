export const browseActor = "Shared browse actor";
export const browseDirector = "Shared browse director";
export const browseGem = "Hidden gem beyond first page";
export const browseNote = "Keep this gem for a rainy evening.";
export const browseFilterGenres = Array.from({ length: 22 }, (_, index) => `Browse genre ${String(index + 1).padStart(2, "0")}`);
export const browseMovies = Array.from({ length: 30 }, (_, index) => ({
    id: 801 + index,
    name: index === 29 ? browseGem : `Catalogue title ${String(index + 1).padStart(2, "0")}`,
    releaseDate: `${2000 + index}-01-01`,
}));

export const communityNavigationCollections = Array.from({ length: 13 }, (_, index) => ({
    id: 901 + index,
    title: `Community navigation ${String(index + 1).padStart(2, "0")}`,
}));
