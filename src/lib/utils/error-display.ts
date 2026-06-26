export const displayContainerError = ({ error }: { error: Error | null }) => {
    if (!error) return null;
    return error.message || "An unexpected error occurred";
};
