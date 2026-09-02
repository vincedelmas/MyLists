import {LinkProps} from "@tanstack/react-router";


export interface LinkSidebarItem {
    id: string;
    label: string;
    to: LinkProps["to"];
    type?: "item" | "separator";
}
