export function formatContinueProgress(position: string, remainingMinutes: number | null) {
    if (remainingMinutes === null || remainingMinutes <= 0) return position;

    const estimate = remainingMinutes < 60 ? "< 1h" : `~ ${Math.round(remainingMinutes / 60)}h`;

    return `${position} · ${estimate} left`;
}
