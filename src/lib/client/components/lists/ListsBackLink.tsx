import {ArrowLeft} from "lucide-react";
import {Link} from "@tanstack/react-router";


export const ListsBackLink = ({ username }: { username: string }) => (
    <Link
        to="/lists/$username"
        params={{ username }}
        className="inline-flex items-center gap-2 rounded-sm text-brand outline-none transition-colors hover:text-brand/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
        <ArrowLeft className="size-4" aria-hidden="true"/>
        Lists & collections
    </Link>
);
