interface InactiveAccountEmailResult {
    userId: number;
    username: string;
    lastSeenAt: string;
    lifecycleId: number | null;
    deletionScheduledAt: string;
}


export type WarningFailedPayload = InactiveAccountEmailResult & { errorMessage: string };
export type WarningSentPayload = InactiveAccountEmailResult & { warningTokenHash: string };
