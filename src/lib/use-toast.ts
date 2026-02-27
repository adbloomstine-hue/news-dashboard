"use client";

import * as React from "react";

type ToastProps = {
  id:          string;
  title?:      string;
  description?: string;
  variant?:    "default" | "success" | "error" | "warning";
  duration?:   number;
  open?:       boolean;
  onOpenChange?: (open: boolean) => void;
};

type ToastInput = Omit<ToastProps, "id">;

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 300;

let count = 0;
function genId() { return `toast-${++count}`; }

type ToastState = { toasts: ToastProps[] };
type ToastAction =
  | { type: "ADD"; toast: ToastProps }
  | { type: "UPDATE"; id: string; toast: Partial<ToastProps> }
  | { type: "DISMISS"; id?: string }
  | { type: "REMOVE"; id?: string };

const listeners: Array<(state: ToastState) => void> = [];
let memoryState: ToastState = { toasts: [] };

function dispatch(action: ToastAction) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((l) => l(memoryState));
}

function reducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case "ADD":
      return { toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT) };
    case "UPDATE":
      return {
        toasts: state.toasts.map((t) =>
          t.id === action.id ? { ...t, ...action.toast } : t
        ),
      };
    case "DISMISS": {
      const { id } = action;
      if (id) {
        setTimeout(() => dispatch({ type: "REMOVE", id }), TOAST_REMOVE_DELAY);
      } else {
        state.toasts.forEach((t) =>
          setTimeout(() => dispatch({ type: "REMOVE", id: t.id }), TOAST_REMOVE_DELAY)
        );
      }
      return {
        toasts: state.toasts.map((t) =>
          !id || t.id === id ? { ...t, open: false } : t
        ),
      };
    }
    case "REMOVE":
      return { toasts: action.id ? state.toasts.filter((t) => t.id !== action.id) : [] };
  }
}

export function toast(input: ToastInput) {
  const id = genId();
  const duration = input.duration ?? 4000;

  dispatch({
    type: "ADD",
    toast: {
      ...input,
      id,
      open: true,
      onOpenChange: (open) => { if (!open) dispatch({ type: "DISMISS", id }); },
    },
  });

  if (duration > 0) {
    setTimeout(() => dispatch({ type: "DISMISS", id }), duration);
  }

  return {
    id,
    dismiss: () => dispatch({ type: "DISMISS", id }),
    update: (props: Partial<ToastProps>) => dispatch({ type: "UPDATE", id, toast: props }),
  };
}

export function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const idx = listeners.indexOf(setState);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  return { ...state, toast, dismiss: (id?: string) => dispatch({ type: "DISMISS", id }) };
}
