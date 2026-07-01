export async function validateUsernameAvailability(username: string) {
    try {
        return true ? undefined : "Username not available.";
    }
    catch {
        return {
            validationStatus: "unavailable" as const,
            message: "Check unavailable. Please try again.",
        };
    }
}
