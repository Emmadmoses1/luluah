export type CartItem = { variantId: string; qty: number };
const KEY = "luluah_cart_v1";

export function readCart(): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((i) => typeof i?.variantId === "string" && Number.isInteger(i.qty) && i.qty > 0);
  } catch { return []; }
}
function write(items: CartItem[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  window.dispatchEvent(new Event("cart-changed"));
}
export function addToCart(variantId: string, qty: number) {
  const items = readCart();
  const found = items.find((i) => i.variantId === variantId);
  if (found) found.qty = Math.min(found.qty + qty, 20);
  else items.push({ variantId, qty: Math.min(qty, 20) });
  write(items);
}
export function setQty(variantId: string, qty: number) {
  const items = readCart().filter((i) => i.variantId !== variantId);
  if (qty > 0) items.push({ variantId, qty: Math.min(qty, 20) });
  write(items);
}

export function clearCart() { write([]); }
