import {resolveMobileProfileUser} from "@/lib/server/mobile/profile-access";
import {createFileRoute} from "@tanstack/react-router";
import {mobileRequest} from "@/lib/server/mobile/request";
import {getMobileLibraryEditor, actOnMobileLibrary, libraryItemSchema, libraryActionSchema} from "@/lib/server/mobile/library-actions";

export const Route = createFileRoute("/api/mobile/v1/library/manage")({
    server: {
        handlers: {
            GET: ({ request }) => mobileRequest(request, async userId => getMobileLibraryEditor(await resolveMobileProfileUser(request, userId, { ownerOnly: true }), libraryItemSchema.parse({
                kind: new URL(request.url).searchParams.get("kind"),
                id: Number(new URL(request.url).searchParams.get("id"))
            }))),
            POST: ({ request }) => mobileRequest(request, async userId => actOnMobileLibrary(await resolveMobileProfileUser(request, userId, { ownerOnly: true }), libraryActionSchema.parse(await request.json()))),
        }
    }
});
