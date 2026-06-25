interface InactiveAccountEmailResult {
    userId: number;
    username: string;
    lastSeenAt: string;
    lifecycleId: number | null;
    deletionScheduledAt: string;
}


export type InactiveAccountWarningFailedPayload = InactiveAccountEmailResult & { errorMessage: string };
export type InactiveAccountWarningSentPayload = InactiveAccountEmailResult & { warningTokenHash: string };
