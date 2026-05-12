import { atom } from 'jotai';

export const authTokenAtom = atom(null);
export const userAtom = atom(null);
export const isLoadingAtom = atom(false);
export const isAuthenticatedAtom = atom(false);
export const walletAtom = atom(null);
export const investmentsAtom = atom([]);
export const transactionsAtom = atom([]);
