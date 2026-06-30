import {createFileRoute, redirect} from "@tanstack/react-router";


export const Route = createFileRoute("/_main/_private/walkthrough/_layout/")({
    beforeLoad: () => {
        throw redirect({ to: "/walkthrough/search-media", replace: true });
    },
});
