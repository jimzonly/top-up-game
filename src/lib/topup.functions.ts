import { supabase } from "@/integrations/supabase/client";

export async function listGames(opts?: { popularOnly?: boolean }) {
  try {
    let q = supabase
      .from("games")
      .select("id, slug, name, publisher, category, image_url, is_popular, requires_server_id, user_id_label")
      .eq("is_active", true)
      .order("is_popular", { ascending: false })
      .order("name");
    if (opts?.popularOnly) q = q.eq("is_popular", true);
    const { data, error } = await q;
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function listActiveProducts() {
  try {
    const productsRes = await supabase
      .from("products")
      .select("id, game_id, name, price, image_url, description, product_type, price_per_unit, min_quantity, sort_order")
      .eq("is_active", true)
      .order("sort_order");

    if (productsRes.error) return [];

    const rawProducts = productsRes.data ?? [];
    if (rawProducts.length === 0) return [];

    const gamesRes = await supabase
      .from("games")
      .select("id, slug, name, category, image_url")
      .eq("is_active", true);

    if (gamesRes.error) return rawProducts.map((p) => ({ ...p, games: null }));

    const gameMap = new Map((gamesRes.data ?? []).map((g) => [g.id, g]));
    return rawProducts.map((p) => ({
      ...p,
      games: gameMap.get(p.game_id) ?? null,
    }));
  } catch {
    return [];
  }
}

export async function getGameWithProducts(slug: string) {
  const { data: game, error: ge } = await supabase
    .from("games")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (ge) throw new Error(ge.message);
  if (!game) return null;
  const { data: products, error: pe } = await supabase
    .from("products")
    .select("id, name, price, sort_order, product_type, min_quantity, price_per_unit, description")
    .eq("game_id", game.id)
    .eq("is_active", true)
    .order("sort_order");
  if (pe) throw new Error(pe.message);
  return { game, products: products ?? [] };
}

export async function createTransaction(input: {
  gameId: string;
  productId: string;
  userGameId: string;
  serverId?: string | null;
  paymentMethod: "qris";
  quantity?: number;
  userInput?: string | null;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  const userId = session.user.id;

  const { data: product, error: pe } = await supabase
    .from("products")
    .select("id, price, cost, game_id, product_type, min_quantity, price_per_unit")
    .eq("id", input.productId)
    .eq("is_active", true)
    .maybeSingle();
  if (pe || !product) throw new Error("Product not found");
  if (product.game_id !== input.gameId) throw new Error("Product/game mismatch");

  const qty = input.quantity ?? 1;
  let totalAmount: number;
  let totalCost: number;

  const isCustomQty = product.product_type === "followers" || product.product_type === "likes";
  if (isCustomQty && product.price_per_unit != null) {
    totalAmount = Number(product.price_per_unit) * qty;
    totalCost = Number(product.cost) * qty;
  } else {
    totalAmount = Number(product.price);
    totalCost = Number(product.cost);
  }

  const orderId = `NT${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const { data: tx, error: te } = await supabase
    .from("transactions")
    .insert({
      order_id: orderId,
      user_id: userId,
      game_id: input.gameId,
      product_id: input.productId,
      user_game_id: input.userGameId,
      server_id: input.serverId ?? null,
      amount: totalAmount,
      cost: totalCost,
      profit: totalAmount - totalCost,
      payment_method: input.paymentMethod,
      status: "waiting_payment",
      quantity: qty,
      user_input: input.userInput ?? null,
    })
    .select("order_id, status")
    .single();
  if (te) throw new Error(te.message);
  return { orderId: tx.order_id, status: tx.status };
}

export async function listMyTransactions() {
  const { data, error } = await supabase
    .from("transactions")
    .select("id, order_id, amount, quantity, status, payment_method, created_at, user_game_id, server_id, user_input, games(name, slug), products(name, product_type)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getMyProfile() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", session.user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { displayName: profile?.display_name ?? null };
}

export async function checkIsAdmin(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();
  if (error || !data) return false;
  return data.role === "admin";
}

export async function adminListTransactions() {
  const { data, error } = await supabase
    .from("transactions")
    .select("id, order_id, user_id, amount, quantity, user_input, status, payment_method, created_at, updated_at, user_game_id, server_id, notes, games(name, slug), products(name, product_type), profiles!transactions_user_id_fkey(display_name)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function adminUpdateTransactionStatus(id: string, status: string) {
  const { error } = await supabase
    .from("transactions")
    .update({ status: status as any, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function adminListGames() {
  try {
    const { data, error } = await supabase.from("games").select("*").order("name");
    if (!error && data && data.length > 0) return data;

    const fallback = await supabase
      .from("games")
      .select("id, slug, name, publisher, category, image_url, is_popular, is_active, requires_server_id, user_id_label")
      .eq("is_active", true)
      .order("name");

    if (fallback.error) return [];
    return fallback.data ?? [];
  } catch {
    return [];
  }
}

export async function adminListProducts() {
  try {
    const [productsRes, gamesRes] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, description, image_url, price, cost, is_active, sort_order, game_id, product_type, min_quantity, price_per_unit")
        .order("created_at", { ascending: false }),
      supabase.from("games").select("id, slug, name, category"),
    ]);

    if (productsRes.error) return [];

    const gameMap = gamesRes.error
      ? new Map()
      : new Map((gamesRes.data ?? []).map((g) => [g.id, g]));

    return (productsRes.data ?? []).map((p) => ({
      ...p,
      games: gameMap.get(p.game_id) ?? null,
    }));
  } catch {
    return [];
  }
}

export async function adminListUsers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, role, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function adminCreateProduct(input: {
  game_id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  price?: number;
  cost?: number;
  sort_order?: number;
  is_active?: boolean;
  product_type?: string;
  min_quantity?: number | null;
  price_per_unit?: number | null;
}) {
  const { data, error } = await supabase
    .from("products")
    .insert({
      game_id: input.game_id,
      name: input.name,
      description: input.description ?? null,
      image_url: input.image_url ?? null,
      price: input.price ?? 0,
      cost: input.cost ?? 0,
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
      product_type: input.product_type ?? "fixed",
      min_quantity: input.min_quantity ?? null,
      price_per_unit: input.price_per_unit ?? null,
    })
    .select("id, name")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function adminUpdateProduct(id: string, input: {
  name?: string;
  description?: string | null;
  image_url?: string | null;
  price?: number;
  cost?: number;
  sort_order?: number;
  is_active?: boolean;
  game_id?: string;
  product_type?: string;
  min_quantity?: number | null;
  price_per_unit?: number | null;
}) {
  const { error } = await supabase.from("products").update(input).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function adminDeleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
