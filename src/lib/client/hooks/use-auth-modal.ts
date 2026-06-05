import {Store, useSelector} from "@tanstack/react-store";


type AuthModalState = {
    redirect?: string;
    view: "login" | "register" | null;
};


const authModalStore = new Store<AuthModalState>({ view: null });


const authModalActions = {
    close: () => authModalStore.setState(() => ({ view: null })),
    openLogin: (redirect?: string) => authModalStore.setState(() => ({ view: "login", redirect })),
    openRegister: (redirect?: string) => authModalStore.setState(() => ({ view: "register", redirect })),
};


export const useAuthModal = () => {
    const view = useSelector(authModalStore, (state) => state.view);
    const redirect = useSelector(authModalStore, (state) => state.redirect);

    return {
        view,
        redirect,
        isOpen: view !== null,
        ...authModalActions,
    };
};
