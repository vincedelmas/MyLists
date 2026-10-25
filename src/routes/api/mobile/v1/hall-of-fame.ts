import {createFileRoute} from "@tanstack/react-router";
import {hallOfFameSearchSchema} from "@/lib/schemas/common.schema";
import {mobileRequest} from "@/lib/server/mobile/request";
import {getMobileHallOfFame} from "@/lib/server/mobile/community";

export const Route = createFileRoute("/api/mobile/v1/hall-of-fame")({
    server: { handlers: { GET: ({ request }) => mobileRequest(request, userId => getMobileHallOfFame(userId, hallOfFameSearchSchema.parse(Object.fromEntries(new URL(request.url).searchParams)))) } },
});
