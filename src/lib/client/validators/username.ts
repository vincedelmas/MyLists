import {getUsernameAvailability} from "@/lib/server/functions/auth";


export async function validateUsernameAvailability(username: string) {
    try {
        const { available } = await getUsernameAvailability({ data: { username } });
        return available ? undefined : "Username not available.";
    }
    catch {
        return {
            validationStatus: "unavailable" as const,
            message: "Check unavailable. Please try again.",
        };
    }
}
