
import { type ToastProps, type ToastActionElement } from "@/components/ui/toast"
import * as React from "react"

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 5000 // 5 seconds

type ToasterToast = {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  variant?: "default" | "destructive"
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function generateId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: Omit<ToasterToast, "id">
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast> & { id: string }
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: string
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: string
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [
          ...state.toasts,
          { id: generateId(), ...action.toast },
        ].slice(0, TOAST_LIMIT),
      }

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action

      // Clear timeout when dismissing toast
      if (toastId) {
        if (toastTimeouts.has(toastId)) {
          clearTimeout(toastTimeouts.get(toastId))
          toastTimeouts.delete(toastId)
        }
      } else {
        for (const [id, timeout] of toastTimeouts.entries()) {
          clearTimeout(timeout)
          toastTimeouts.delete(id)
        }
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

function dismissToast(toastId: string) {
  dispatch({ type: actionTypes.DISMISS_TOAST, toastId })
}

function removeToast(toastId: string) {
  dispatch({ type: actionTypes.REMOVE_TOAST, toastId })
}

// Function to set up auto-dismiss timeout
function setupDismissTimeout(toastId: string) {
  if (toastTimeouts.has(toastId)) {
    clearTimeout(toastTimeouts.get(toastId))
  }
  
  const timeout = setTimeout(() => {
    dismissToast(toastId)
    
    // Add a slight delay before removing from DOM
    setTimeout(() => {
      removeToast(toastId)
    }, 300) // Animation duration
  }, TOAST_REMOVE_DELAY)
  
  toastTimeouts.set(toastId, timeout)
  
  return () => {
    clearTimeout(timeout)
    toastTimeouts.delete(toastId)
  }
}

type ToastCreationProps = Omit<ToasterToast, "id">

function toast(props: ToastCreationProps) {
  const id = generateId()

  const update = (props: Partial<ToasterToast>) =>
    dispatch({
      type: actionTypes.UPDATE_TOAST,
      toast: { ...props, id },
    })

  const dismiss = () => {
    dismissToast(id)
    setTimeout(() => removeToast(id), 300) // Animation duration
  }

  // Clear any existing timeout for this toast ID
  if (toastTimeouts.has(id)) {
    clearTimeout(toastTimeouts.get(id))
    toastTimeouts.delete(id)
  }

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) {
          dismiss()
        }
        // Call the original onOpenChange if provided
        if (props.onOpenChange) {
          props.onOpenChange(open)
        }
      },
    },
  })

  // Set up auto-dismiss timeout
  setupDismissTimeout(id)

  return {
    id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => {
      if (toastId) {
        dismissToast(toastId)
        setTimeout(() => removeToast(toastId), 300) // Animation duration
      }
    },
  }
}

export { useToast, toast }
export type { ToasterToast }
