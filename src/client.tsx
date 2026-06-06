import {hydrateRoot} from "react-dom/client";
import {StartClient} from "@tanstack/react-start/client";


if (import.meta.env.DEV) {
    await import("vite-plugin-react-click-to-component/client");
}


hydrateRoot(document, <StartClient/>);
