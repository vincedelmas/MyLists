import {createFileRoute, redirect} from "@tanstack/react-router";


export const Route = createFileRoute("/_main/_private/settings/_layout/imports/")({
    beforeLoad: () => {
        throw redirect({ to: "/settings/imports/letterboxd", search: true, replace: true });
    },
});
