import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Zap, ShieldCheck, Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listGames, listActiveProducts } from "@/lib/topup.functions";
import { gameImage, formatIDR } from "@/lib/games";
import heroBg from "@/assets/hero-bg.jpg";

export default function HomePage() {
  const { data: games = [] } = useQuery({
    queryKey: ["games", "all"],
    queryFn: () => listGames(),
  });

  const productsQuery = useQuery({
    queryKey: ["products", "active"],
    queryFn: listActiveProducts,
  });
  const products = productsQuery.data ?? [];

  const [q, setQ] = useState("");
  const filtered = games.filter(
    (g) =>
      g.name.toLowerCase().includes(q.toLowerCase()) ||
      (g.category ?? "").toLowerCase().includes(q.toLowerCase())
  );
  const popular = filtered.filter((g) => g.is_popular).slice(0, 6);

  const filteredProducts = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q.toLowerCase()) ||
          ((p.games as any)?.name ?? "").toLowerCase().includes(q.toLowerCase()) ||
          ((p.games as any)?.category ?? "").toLowerCase().includes(q.toLowerCase())
      )
    : products;

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <img
          src={heroBg}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-40"
          width={1920}
          height={1088}
        />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative container mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5 text-[var(--neon)]" /> Instant delivery · 24/7 support
            </span>
            <h1 className="mt-5 text-4xl md:text-6xl font-bold leading-[1.05]">
              Top up your game.{" "}
              <span className="neon-text">Power up</span>
              <br /> in seconds.
            </h1>
            <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-2xl">
              Mobile Legends, Free Fire, PUBG, Valorant, Genshin Impact &amp; more — secure
              payments, automatic processing, real-time order updates.
            </p>
            <div className="mt-8 glass-strong rounded-2xl p-2 max-w-xl flex items-center gap-2 neon-ring">
              <Search className="ml-3 h-5 w-5 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search a game or product (e.g. Mobile Legends, Free Fire)…"
                className="border-0 bg-transparent focus-visible:ring-0 text-base"
              />
              <Button size="sm" className="bg-[var(--neon)] text-[oklch(0.08_0.04_258)] hover:bg-[var(--neon)]/90 font-semibold">
                Search
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-[var(--neon)]" /> Instant
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[var(--neon)]" /> Secure
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-[var(--neon)]" /> Best price
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* POPULAR GAMES */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--neon)]">Most played</p>
            <h2 className="text-2xl md:text-3xl font-bold mt-1">Popular Games</h2>
          </div>
          <Link to="/games" className="text-sm text-[var(--neon)] hover:text-[var(--neon-soft)]">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {popular.map((g) => (
            <Link
              key={g.id}
              to={`/games/${g.slug}`}
              className="group glass rounded-2xl overflow-hidden hover-glow"
            >
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src={gameImage(g.slug)}
                  alt={g.name}
                  width={512}
                  height={640}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold truncate">{g.name}</p>
                <p className="text-xs text-muted-foreground truncate">{g.publisher}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ALL PRODUCTS */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--neon)]">Shop</p>
            <h2 className="text-2xl md:text-3xl font-bold mt-1">All Products</h2>
          </div>
        </div>
        {productsQuery.isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl aspect-[4/3] animate-pulse" />
            ))}
          </div>
        ) : productsQuery.isError ? (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-red-400">Failed to load products: {productsQuery.error?.message ?? "Unknown error"}</p>
            <button onClick={() => productsQuery.refetch()} className="mt-3 text-sm text-[var(--neon)] underline">Retry</button>
          </div>
        ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredProducts.map((p) => {
            const game = p.games as any;
            const slug = game?.slug ?? "";
            const isCustom = p.product_type === "followers" || p.product_type === "likes";
            const displayPrice = isCustom && p.price_per_unit != null
              ? Number(p.price_per_unit)
              : Number(p.price);
            const priceLabel = isCustom ? `${formatIDR(displayPrice)}/unit` : formatIDR(displayPrice);

            return (
              <Link
                key={p.id}
                to={`/checkout?productId=${p.id}`}
                state={{
                  product: {
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    price_per_unit: p.price_per_unit,
                    product_type: p.product_type,
                    min_quantity: p.min_quantity,
                    description: p.description,
                    image_url: p.image_url,
                    game_id: p.game_id,
                    game_name: game?.name,
                    game_slug: game?.slug,
                  },
                }}
                className="group glass rounded-2xl overflow-hidden hover-glow"
              >
                <div className="aspect-[4/3] overflow-hidden relative">
                  <img
                    src={p.image_url || (game ? gameImage(game.slug) : gameImage(slug))}
                    alt={p.name}
                    width={512}
                    height={384}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {game?.category && (
                    <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wider rounded-full bg-black/60 backdrop-blur-sm border border-[var(--neon)]/30 px-2 py-0.5 text-[var(--neon)] font-medium">
                      {game.category}
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs text-muted-foreground truncate">{game?.name ?? ""}</p>
                  <p className="text-sm font-semibold truncate mt-0.5">{p.name}</p>
                  <p className="text-sm font-bold text-[var(--neon)] mt-1">{priceLabel}</p>
                </div>
              </Link>
            );
          })}
          {filteredProducts.length === 0 && (
            <p className="col-span-full text-muted-foreground text-center py-12">
              No products available yet.
            </p>
          )}
        </div>
        )}
      </section>

      {/* ALL GAMES */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--neon)]">Browse</p>
            <h2 className="text-2xl md:text-3xl font-bold mt-1">All Games</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((g) => (
            <Link
              key={g.id}
              to={`/games/${g.slug}`}
              className="group glass rounded-2xl overflow-hidden hover-glow"
            >
              <div className="flex">
                <img
                  src={gameImage(g.slug)}
                  alt={g.name}
                  width={120}
                  height={150}
                  loading="lazy"
                  className="h-28 w-24 object-cover"
                />
                <div className="p-3 flex-1 min-w-0">
                  <p className="font-semibold truncate">{g.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{g.publisher}</p>
                  <span className="inline-block mt-2 text-[10px] uppercase tracking-wider rounded-full bg-[var(--neon)]/10 border border-[var(--neon)]/30 px-2 py-0.5 text-[var(--neon)]">
                    {g.category}
                  </span>
                </div>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-muted-foreground text-center py-12">
              No games match "{q}".
            </p>
          )}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container mx-auto px-4 py-12 pb-24">
        <h2 className="text-2xl md:text-3xl font-bold mb-6">Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {["MOBA", "Battle Royale", "FPS", "RPG", "Social Media"].map((c) => (
            <div key={c} className="glass rounded-2xl p-6 hover-glow">
              <p className="text-xs uppercase tracking-widest text-[var(--neon)]">Category</p>
              <p className="mt-1 text-xl font-bold">{c}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {filtered.filter((g) => g.category === c).length} games
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
