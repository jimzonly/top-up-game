import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listGames, listActiveProducts } from "@/lib/topup.functions";
import { gameImage, formatIDR } from "@/lib/games";

export default function GamesPage() {
  const { data: games = [], isLoading } = useQuery({
    queryKey: ["games", "all"],
    queryFn: () => listGames(),
  });

  const productsQuery = useQuery({
    queryKey: ["products", "active"],
    queryFn: listActiveProducts,
  });
  const products = productsQuery.data ?? [];

  console.log("[GamesPage] productsQuery status:", productsQuery.status,
    "| data:", products.length, "items",
    "| error:", productsQuery.error?.message ?? "none");

  // Group products by game
  const productsByGame: Record<string, any[]> = {};
  for (const p of products) {
    const gameId = (p.games as any)?.id;
    if (!gameId) continue;
    if (!productsByGame[gameId]) productsByGame[gameId] = [];
    productsByGame[gameId].push(p);
  }

  return (
    <div className="container mx-auto px-4 py-10 pb-24">
      <h1 className="text-3xl md:text-4xl font-bold">All Games</h1>
      <p className="text-muted-foreground mt-2">Pick a game to start your top-up.</p>

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl aspect-[4/5] animate-pulse" />
            ))
          : games.map((g) => {
              const gameProducts = productsByGame[g.id] ?? [];
              return (
                <Link
                  key={g.id}
                  to={`/games/${g.slug}`}
                  className="group glass rounded-2xl overflow-hidden hover-glow"
                >
                  <div className="aspect-[4/5] overflow-hidden relative">
                    <img
                      src={gameImage(g.slug)}
                      alt={g.name}
                      loading="lazy"
                      width={512}
                      height={640}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {gameProducts.length > 0 && (
                      <span className="absolute bottom-2 right-2 text-[10px] rounded-full bg-black/60 backdrop-blur-sm border border-[var(--neon)]/30 px-2 py-0.5 text-[var(--neon)] font-medium">
                        {gameProducts.length} items
                      </span>
                    )}
                    {g.category && (
                      <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wider rounded-full bg-black/60 backdrop-blur-sm border border-[var(--neon)]/30 px-2 py-0.5 text-[var(--neon)] font-medium">
                        {g.category}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold truncate">{g.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{g.publisher}</p>
                    {gameProducts.length > 0 && (
                      <p className="text-xs font-semibold text-[var(--neon)] mt-1">
                        From {formatIDR(Math.min(...gameProducts.map((p: any) => {
                          const isCustom = p.product_type === "followers" || p.product_type === "likes";
                          return isCustom && p.price_per_unit != null ? Number(p.price_per_unit) : Number(p.price);
                        })))}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
      </div>

      {/* All Products */}
      {!isLoading && (
        <div className="mt-16">
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
          ) : products.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">No products available yet.</p>
          ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((p) => {
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
          </div>
          )}
        </div>
      )}
    </div>
  );
}
