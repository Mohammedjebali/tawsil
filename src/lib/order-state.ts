// Order state machine — valid status transitions for orders and store_orders

export const VALID_TRANSITIONS: Record<string, string[]> = {
  store_pending: ['confirmed', 'cancelled'],
  pending: ['accepted', 'cancelled'],
  accepted: ['picked_up', 'cancelled'],
  picked_up: ['waiting_customer', 'cancelled'],
  waiting_customer: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

// Store order states (store_orders table)
export const STORE_ORDER_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['picked_up'],
  picked_up: [],
  cancelled: [],
};

export function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isValidStoreTransition(from: string, to: string): boolean {
  return STORE_ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}
