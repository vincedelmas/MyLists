import {Lightbulb} from "lucide-react";
import {Link} from "@tanstack/react-router";


export const FeatureVoteLink = () => {
    return (
        <Link
            to="/features-vote"
            className="group fixed bottom-5 right-5 z-50 flex h-10 w-10 items-center justify-center rounded-full border
            border-white/20 bg-black/20 backdrop-blur-xl transition-all duration-300 hover:border-amber-400
            hover:shadow-[0_0_20px_rgba(251,191,36,0.4)] active:scale-95 overflow-hidden"
        >
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-linear-to-r
            from-transparent via-white/30 to-transparent"/>
            <Lightbulb className="size-4 transition-transform duration-300 group-hover:scale-110 group-hover:text-amber-300"/>
            <span className="sr-only">Feature voting</span>
        </Link>
    );
};
