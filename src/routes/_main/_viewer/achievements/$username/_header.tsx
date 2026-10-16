import {createFileRoute, Outlet} from "@tanstack/react-router";


export const Route = createFileRoute("/_main/_viewer/achievements/$username/_header")({
    component: Outlet,
    head: ({ params: { username } }) => ({
        meta: [{ title: `${username} Achievements - MyLists` }],
    }),
});
