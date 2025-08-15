import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const LOGIN_ACTION_ID = "login";
export const CREATE_SUPPORT_TICKET_ACTION_ID = "create-support-ticket";
export const ADD_TO_CART_ACTION_ID = "add-to-cart";
export const SHOW_ALL_ACTIONS_ID = "show-all-actions";
export const SHOW_PAGE_ACTIONS_ID = "show-page-actions";
