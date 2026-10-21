import {createFileRoute} from "@tanstack/react-router";
import {mobileRequest} from "@/lib/server/mobile/request";
import {getMobileProfileExtras} from "@/lib/server/mobile/profile";

export const Route = createFileRoute("/api/mobile/v1/profile/extras")({
    server: {handlers: {GET: ({request}) => mobileRequest(request, getMobileProfileExtras)}},
});
