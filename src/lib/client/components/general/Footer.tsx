import {clientEnv} from "@/env/client";
import {FaGithub} from "react-icons/fa";
import {Link} from "@tanstack/react-router";
import {Activity, Coffee, Mail} from "lucide-react";
import {Button} from "@/lib/client/components/ui/button";
import {Separator} from "@/lib/client/components/ui/separator";


export const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="mt-20 w-full border-t bg-background">
            <div className="mx-auto max-w-7xl px-4 py-6">
                <div className="grid grid-cols-12 gap-12 max-sm:grid-cols-1 max-sm:gap-8 max-sm:mb-8">
                    <div className="md:col-span-6 flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-xl font-bold">
                            <img width={20} alt="MyLists logo" src="/favicon.ico"/>
                            <span>MyLists.info</span>
                        </div>
                        <p className="text-muted-foreground text-sm max-w-md leading-relaxed">
                            A personal project to track your media journey.
                            Organize TV shows, movies, games, books and manga, in one place,
                            compare progress with friends, and climb the Hall of Fame.
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                            <Button
                                variant="outline"
                                nativeButton={false}
                                render={
                                    <a
                                        aria-label="Contact MyLists by email"
                                        href={`mailto:${clientEnv.VITE_CONTACT_MAIL}`}
                                    />
                                }
                            >
                                <Mail data-icon="inline-start"/> Contact Me
                            </Button>
                            <Button
                                nativeButton={false}
                                render={
                                    <a
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Support MyLists on Buy Me a Coffee"
                                        href="https://www.buymeacoffee.com/crossoufire"
                                    />
                                }
                            >
                                <Coffee data-icon="inline-start"/> Buy Me A Coffee
                            </Button>
                        </div>
                    </div>
                    <div className="md:col-span-3">
                        <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider">
                            Resources
                        </h4>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li>
                                <a href="https://github.com/Crossoufire/MyLists" className="flex items-center gap-2 transition-colors hover:text-brand">
                                    <FaGithub className="size-4"/> GitHub
                                </a>
                            </li>
                            <li>
                                <Link to="/features" className="flex items-center gap-2 transition-colors hover:text-brand">
                                    <Activity className="size-4"/> News & Features
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div className="md:col-span-3">
                        <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider">
                            Information
                        </h4>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li>
                                <Link to="/about" className="transition-colors hover:text-brand">
                                    About the Project
                                </Link>
                            </li>
                            <li>
                                <Link to="/privacy-policy" className="transition-colors hover:text-brand">
                                    Privacy Policy
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <Separator className="my-4 opacity-50"/>

                <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
                    <p>© 2019-{currentYear} — MyLists.info</p>
                    <p className="flex items-center gap-1 italic">
                        Made with ❤️ in France
                    </p>
                </div>
            </div>
        </footer>
    );
};
