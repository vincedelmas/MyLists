import type {ReactNode} from "react";


export const MediaListGrid = ({ children }: { children: ReactNode }) => (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3 lg:gap-4 lg:grid-cols-5 sm:gap-5">
        {children}
    </div>
);
