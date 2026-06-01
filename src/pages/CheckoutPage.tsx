import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle, QrCode, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatIDR, gameImage } from "@/lib/games";
import { useAuth } from "@/hooks/use-auth";
import { QrisModal } from "@/components/qris-modal";

const WA_NUMBER = "6289539223044";

interface CheckoutProduct {
  id: string;
  name: string;
  price: number;
  price_per_unit?: number | null;
  product_type: string;
  min_quantity?: number | null;
  description?: string | null;
  image_url?: string | null;
  game_id: string;
  game_name?: string;
  game_slug?: string;
}

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const productFromState = location.state?.product as CheckoutProduct | undefined;
  const productIdFromSearch = new URLSearchParams(location.search).get("productId");

  const [product, setProduct] = useState<CheckoutProduct | null>(productFromState ?? null);
  const [userGameId, setUserGameId] = useState("");
  const [serverId, setServerId] = useState("");
  const [requiresServerId, setRequiresServerId] = useState(false);
  const [userIdLabel, setUserIdLabel] = useState("User ID");
  const [quantity, setQuantity] = useState(1);
  const [qrisOpen, setQrisOpen] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch product from DB if not passed via state
  const { isLoading: fetchingProduct } = useQuery({
    queryKey: ["product-checkout", productIdFromSearch],
    queryFn: async () => {
      if (!productIdFromSearch) return null;
      const { data: p } = await supabase
        .from("products")
        .select("id, name, price, price_per_unit, product_type, min_quantity, description, image_url, game_id, games(name, slug, requires_server_id, user_id_label)")
        .eq("id", productIdFromSearch)
        .eq("is_active", true)
        .maybeSingle();
      if (!p) return null;
      const g = p.games as any;
      const built: CheckoutProduct = {
        id: p.id,
        name: p.name,
        price: p.price,
        price_per_unit: p.price_per_unit,
        product_type: p.product_type,
        min_quantity: p.min_quantity,
        description: p.description,
        image_url: p.image_url,
        game_id: p.game_id,
        game_name: g?.name,
        game_slug: g?.slug,
      };
      setProduct(built);
      if (g?.requires_server_id) setRequiresServerId(true);
      if (g?.user_id_label) setUserIdLabel(g.user_id_label);
      if (p.min_quantity) setQuantity(p.min_quantity);
      return built;
    },
    enabled: !productFromState && !!productIdFromSearch,
  });

  // Fetch game details when product is from state
  useEffect(() => {
    if (!productFromState) return;
    supabase
      .from("games")
      .select("requires_server_id, user_id_label")
      .eq("id", productFromState.game_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.requires_server_id) setRequiresServerId(true);
        if (data?.user_id_label) setUserIdLabel(data.user_id_label);
      });
    if (productFromState.min_quantity) setQuantity(productFromState.min_quantity);
  }, [productFromState]);

  const isCustomQty = product?.product_type === "followers" || product?.product_type === "likes";
  const effectiveQty = isCustomQty ? quantity : 1;
  const totalPrice = isCustomQty && product?.price_per_unit != null
    ? Number(product.price_per_unit) * effectiveQty
    : product ? Number(product.price) : 0;

  const handleOrder = async () => {
    if (!product) return;
    if (!user) {
      toast.error("Please sign in to continue");
      navigate(`/login?redirect=${location.pathname}${location.search}`);
      return;
    }
    if (!userGameId.trim()) return toast.error("Masukkan User ID kamu");
    if (requiresServerId && !serverId.trim()) return toast.error("Masukkan Server ID kamu");
    if (isCustomQty && quantity < (product.min_quantity ?? 1)) {
      return toast.error(`Minimum ${product.min_quantity?.toLocaleString()} untuk produk ini`);
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const oid = `NT${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const cost = 0;
      const { error } = await supabase.from("transactions").insert({
        order_id: oid,
        user_id: session.user.id,
        game_id: product.game_id,
        product_id: product.id,
        user_game_id: userGameId.trim(),
        server_id: serverId.trim() || null,
        amount: totalPrice,
        cost,
        profit: totalPrice - cost,
        payment_method: "qris",
        status: "waiting_payment",
        quantity: effectiveQty,
      });
      if (error) throw new Error(error.message);
      setOrderId(oid);
      setOrdered(true);
      toast.success(`Order ${oid} berhasil dibuat!`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat order");
    } finally {
      setSubmitting(false);
    }
  };

  const buildWaMessage = () => {
    const priceStr = formatIDR(totalPrice);
    const qtyStr = isCustomQty ? `\nJumlah: ${effectiveQty.toLocaleString()}` : "";
    const orderStr = orderId ? `\nOrder ID: ${orderId}` : "";
    const msg = `Halo Admin JimzStore, saya sudah melakukan pembayaran.\n\nProduk: ${product?.name}${qtyStr}\nHarga: ${priceStr}${orderStr}\n\nBerikut bukti pembayaran saya.`;
    return encodeURIComponent(msg);
  };

  const handleSendProof = () => {
    if (!product) return;
    const msg = buildWaMessage();
    window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, "_blank");
  };

  if (fetchingProduct) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--neon)]" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Produk tidak ditemukan</h1>
        <Link to="/games" className="mt-4 inline-block text-sm text-[var(--neon)] underline">
          Kembali ke semua game
        </Link>
      </div>
    );
  }

  const coverImage = product.image_url || (product.game_slug ? gameImage(product.game_slug) : undefined);

  if (ordered) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-lg">
        <div className="glass-strong rounded-3xl p-8 neon-ring text-center space-y-6">
          <div className="grid h-16 w-16 mx-auto place-items-center rounded-full bg-emerald-500/20">
            <Check className="h-8 w-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Order Berhasil Dibuat!</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Order <span className="font-mono text-foreground">{orderId}</span> sedang menunggu pembayaran.
            </p>
          </div>

          {/* Order summary */}
          <div className="glass rounded-2xl p-4 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Produk</span>
              <span className="font-medium">{product.name}</span>
            </div>
            {isCustomQty && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Jumlah</span>
                <span className="font-medium">{effectiveQty.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold text-[var(--neon)]">{formatIDR(totalPrice)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              className="w-full h-12 gap-2 bg-[var(--gradient-primary)] text-primary-foreground hover:opacity-90 neon-ring font-semibold"
              onClick={() => setQrisOpen(true)}
            >
              <QrCode className="h-5 w-5" /> Lihat QRIS &amp; Bayar
            </Button>
            <Button
              className="w-full h-12 gap-2 bg-[oklch(0.72_0.18_155)] text-[oklch(0.12_0.04_160)] hover:opacity-90 font-semibold"
              onClick={handleSendProof}
            >
              <MessageCircle className="h-5 w-5" /> Kirim Bukti Pembayaran
            </Button>
            <p className="text-xs text-muted-foreground">
              Bayar via QRIS lalu kirim bukti ke WhatsApp admin.
            </p>
            <Link to="/dashboard">
              <Button variant="ghost" className="w-full">Lihat Order Saya</Button>
            </Link>
          </div>
        </div>
        <QrisModal open={qrisOpen} onClose={() => setQrisOpen(false)} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 pb-24 max-w-2xl">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali
      </button>

      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      <div className="space-y-5">
        {/* Product card */}
        <section className="glass-strong rounded-2xl p-5 neon-ring">
          <h2 className="text-xs uppercase tracking-widest text-[var(--neon)] mb-4 font-semibold">Detail Produk</h2>
          <div className="flex gap-4 items-center">
            {coverImage && (
              <img
                src={coverImage}
                alt={product.name}
                className="h-20 w-20 rounded-xl object-cover shrink-0"
              />
            )}
            <div className="min-w-0">
              {product.game_name && (
                <p className="text-xs text-muted-foreground mb-0.5">{product.game_name}</p>
              )}
              <p className="font-bold text-lg leading-tight">{product.name}</p>
              {product.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
              )}
              <p className="mt-2 text-xl font-bold text-[var(--neon)]">
                {isCustomQty && product.price_per_unit != null
                  ? `${formatIDR(Number(product.price_per_unit))} / unit`
                  : formatIDR(Number(product.price))}
              </p>
            </div>
          </div>
        </section>

        {/* Account info */}
        <section className="glass-strong rounded-2xl p-5">
          <h2 className="text-xs uppercase tracking-widest text-[var(--neon)] mb-4 font-semibold">Info Akun</h2>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">{userIdLabel}</Label>
              <Input
                value={userGameId}
                onChange={(e) => setUserGameId(e.target.value)}
                placeholder="Masukkan User ID kamu"
                className="mt-1"
              />
            </div>
            {requiresServerId && (
              <div>
                <Label className="text-sm">Server ID</Label>
                <Input
                  value={serverId}
                  onChange={(e) => setServerId(e.target.value)}
                  placeholder="Masukkan Server ID kamu"
                  className="mt-1"
                />
              </div>
            )}
          </div>
        </section>

        {/* Quantity for custom products */}
        {isCustomQty && (
          <section className="glass-strong rounded-2xl p-5">
            <h2 className="text-xs uppercase tracking-widest text-[var(--neon)] mb-4 font-semibold">Jumlah</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(product.min_quantity ?? 1, quantity - (product.min_quantity ?? 1)))}
                  className="grid h-10 w-10 place-items-center rounded-xl glass border border-border/50 hover:border-[var(--neon)]/50 transition"
                  disabled={quantity <= (product.min_quantity ?? 1)}
                >
                  -
                </button>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(product.min_quantity ?? 1, parseInt(e.target.value) || 0))}
                  className="text-center font-bold"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + (product.min_quantity ?? 1))}
                  className="grid h-10 w-10 place-items-center rounded-xl glass border border-border/50 hover:border-[var(--neon)]/50 transition"
                >
                  +
                </button>
              </div>
              {product.min_quantity && (
                <p className="text-xs text-muted-foreground">Minimum: {product.min_quantity.toLocaleString()}</p>
              )}
            </div>
          </section>
        )}

        {/* Payment method */}
        <section className="glass-strong rounded-2xl p-5">
          <h2 className="text-xs uppercase tracking-widest text-[var(--neon)] mb-4 font-semibold">Metode Pembayaran</h2>
          <div className="rounded-xl p-4 glass border border-[var(--neon)]/25 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary">
              <QrCode className="h-5 w-5 text-[var(--neon)]" />
            </div>
            <div>
              <p className="font-semibold text-sm">QRIS</p>
              <p className="text-xs text-muted-foreground">Bayar via QRIS lalu konfirmasi ke admin WhatsApp</p>
            </div>
            <Check className="ml-auto h-5 w-5 text-[var(--neon)]" />
          </div>
        </section>

        {/* Order summary */}
        <section className="glass-strong rounded-2xl p-5">
          <h2 className="text-xs uppercase tracking-widest text-[var(--neon)] mb-4 font-semibold">Ringkasan Order</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Produk</dt>
              <dd className="font-medium text-right max-w-[60%]">{product.name}</dd>
            </div>
            {isCustomQty && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Jumlah</dt>
                <dd className="font-medium">{quantity.toLocaleString()}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Pembayaran</dt>
              <dd className="font-medium">QRIS</dd>
            </div>
            <div className="my-2 h-px bg-border/50" />
            <div className="flex justify-between text-base">
              <dt className="font-semibold">Total</dt>
              <dd className="font-bold text-[var(--neon)] text-xl">{formatIDR(totalPrice)}</dd>
            </div>
          </dl>
        </section>

        {/* CTA */}
        <Button
          onClick={handleOrder}
          disabled={submitting || !userGameId.trim() || (requiresServerId && !serverId.trim())}
          className="w-full h-12 bg-[var(--gradient-primary)] text-primary-foreground hover:opacity-90 neon-ring font-semibold text-base disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Buat Order & Bayar Sekarang"}
        </Button>
        <p className="text-xs text-muted-foreground text-center pb-4">
          Setelah membuat order, kamu akan diarahkan ke halaman pembayaran QRIS.
        </p>
      </div>

      <QrisModal open={qrisOpen} onClose={() => setQrisOpen(false)} />
    </div>
  );
}
