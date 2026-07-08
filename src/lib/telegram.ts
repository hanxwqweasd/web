// ============================================
// Telegram Web App SDK Utilities
// ============================================

interface TelegramUser {
  id: number;
  first_name: string;
  username?: string;
  last_name?: string;
  language_code?: string;
}

interface WebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  initDataUnsafe: {
    user?: TelegramUser;
    start_param?: string;
    chat?: { id: number; type: string; title?: string };
  };
  openInvoice: (url: string, callback?: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void) => string;
  HapticFeedback: {
    impactOccurred: (type: 'light' | 'medium' | 'heavy') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  onEvent: (eventType: string, callback: (...args: never[]) => void) => void;
  offEvent: (eventType: string, callback: (...args: never[]) => void) => void;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  MainButton: {
    text: string;
    show: () => void;
    hide: () => void;
    onClick: (fn: () => void) => void;
  };
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (fn: () => void) => void;
  };
  showPopup: (params: { title?: string; message: string; buttons?: Array<{ type?: string; text: string }> }) => void;
  sendData: (data: string) => void;
}

// Access the global Telegram WebApp object
declare global {
  interface Window {
    Telegram?: {
      WebApp: WebApp;
    };
  }
}

/**
 * Check if the app is running inside Telegram Web App
 */
export function isTelegramWebApp(): boolean {
  return typeof window !== 'undefined' && !!window.Telegram?.WebApp;
}

/**
 * Get the Telegram user data if available
 */
export function getTelegramUser(): TelegramUser | null {
  if (!isTelegramWebApp()) return null;
  return window.Telegram!.WebApp.initDataUnsafe.user ?? null;
}

/**
 * Open a Telegram Stars invoice
 * @param url - The invoice URL from createInvoiceLink API
 * @param callback - Optional callback for invoice status
 */
export function openStarsInvoice(
  url: string,
  callback?: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void
): string | null {
  if (!isTelegramWebApp()) return null;
  return window.Telegram!.WebApp.openInvoice(url, callback);
}

/**
 * Trigger haptic feedback
 * @param type - The type of haptic feedback
 */
export function hapticFeedback(type: 'light' | 'medium' | 'heavy' | 'error' | 'success'): void {
  if (!isTelegramWebApp()) return;

  const haptic = window.Telegram!.WebApp.HapticFeedback;
  if (type === 'light' || type === 'medium' || type === 'heavy') {
    haptic.impactOccurred(type);
  } else {
    haptic.notificationOccurred(type);
  }
}

/**
 * Initialize the Telegram Web App (call ready + expand)
 */
export function initTelegramWebApp(): void {
  if (!isTelegramWebApp()) return;

  const webApp = window.Telegram!.WebApp;
  webApp.ready();
  webApp.expand();
}

/**
 * Subscribe to invoice_closed event
 * @param callback - Called when an invoice is closed with { status, payload }
 */
export function onInvoiceClosed(
  callback: (event: { status: string; payload?: string }) => void
): void {
  if (!isTelegramWebApp()) return;

  window.Telegram!.WebApp.onEvent('invoice_closed', callback as (...args: never[]) => void);
}

/**
 * Unsubscribe from invoice_closed event
 */
export function offInvoiceClosed(
  callback: (event: { status: string; payload?: string }) => void
): void {
  if (!isTelegramWebApp()) return;

  window.Telegram!.WebApp.offEvent('invoice_closed', callback as (...args: never[]) => void);
}

/**
 * Get the WebApp instance (for advanced usage)
 */
export function getWebApp(): WebApp | null {
  if (!isTelegramWebApp()) return null;
  return window.Telegram!.WebApp;
}