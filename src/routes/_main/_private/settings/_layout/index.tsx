import {createFileRoute, redirect} from "@tanstack/react-router";


export const Route = createFileRoute("/_main/_private/settings/_layout/")({
    beforeLoad: () => {
        throw redirect({ to: "/settings/general", replace: true });
    },
});
