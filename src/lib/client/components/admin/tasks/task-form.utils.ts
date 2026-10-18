export function formatTaskLabel(name: string) {
    const label = name
        .replaceAll("_", " ")
        .replaceAll("-", " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2");

    return label.charAt(0).toUpperCase() + label.slice(1);
}
