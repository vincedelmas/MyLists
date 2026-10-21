export const feelingOptions = [
    {value: "0", label: "Awful"},
    {value: "2", label: "Disliked"},
    {value: "4", label: "Meh"},
    {value: "6", label: "Liked"},
    {value: "8", label: "Loved"},
    {value: "10", label: "Amazing"},
];
export const scoreOptions = Array.from({length: 21}, (_, index) => ({
    value: String(index / 2),
    label: `${index / 2} / 10`,
}));
export const ratingLabel = (value: number, system: "score" | "feeling") =>
    system === "score"
        ? String(value)
        : feelingOptions.reduce((closest, item) =>
              Math.abs(Number(item.value) - value) < Math.abs(Number(closest.value) - value) ? item : closest,
          ).label;
