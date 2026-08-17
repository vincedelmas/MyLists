import {describe, expect, it} from "vitest";
import {MediaType} from "@/lib/utils/enums";
import {InactiveMediaTypeError, inactiveMediaTypeErrorAdapter} from "@/lib/utils/error-classes";


describe("InactiveMediaTypeError", () => {
    it("retains its type and media type across server serialization", () => {
        const error = new InactiveMediaTypeError(MediaType.MOVIES);
        const restored = inactiveMediaTypeErrorAdapter.fromSerializable(
            inactiveMediaTypeErrorAdapter.toSerializable(error),
        );

        expect(restored).toBeInstanceOf(InactiveMediaTypeError);
        expect(restored.mediaType).toBe(MediaType.MOVIES);
        expect(restored.message).toBe("The movies list is not activated");
    });
});
