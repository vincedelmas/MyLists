import type {ReactNode} from "react";


export const MediaListGrid = ({ children }: { children: ReactNode }) => (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 md:gap-x-4 lg:grid-cols-6">
        {children}
    </div>
);
