import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Receipt,
  Package,
  Loader as Loader2,
  Check,
  Circle as XCircle,
  Clock,
  Plus,
  Pencil,
  Trash2,
  DollarSign,
  TrendingUp,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  adminListTransactions,
  adminUpdateTransactionStatus,
  adminListGames,
  adminListProducts,
  adminListUsers,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
} from "@/lib/topup.functions";
import { formatIDR } from "@/lib/games";

/* ─── Status helpers ─── */

const STATUS_OPTIONS = [
  { value: "waiting_payment", label: "Waiting Payment" },
  { value: "waiting_confirmation", label: "Waiting Confirmation" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

const STATUS_STYLES: Record<string, string> = {
  waiting_payment: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  waiting_confirmation: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  processing: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  failed: "bg-red-500/15 text-red-300 border-red-500/30",
};

const STATUS_ICONS: Record<string, any> = {
  waiting_payment: Clock,
  waiting_confirmation: Clock,
  processing: Loader2,
  completed: Check,
  failed: XCircle,
};

/* ─── Types ─── */

type Section = "dashboard" | "products" | "transactions" | "settings";

const PRODUCT_TYPE_OPTIONS = [
  { value: "fixed", label: "Fixed Price" },
  { value: "followers", label: "Followers (Custom Qty)" },
  { value: "likes", label: "Likes (Custom Qty)" },
];

const PRODUCT_TYPE_BADGES: Record<string, string> = {
  fixed: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  followers: "bg-teal-500/15 text-teal-300 border-teal-500/30",
  likes: "bg-pink-500/15 text-pink-300 border-pink-500/30",
};

interface ProductForm {
  game_id: string;
  name: string;
  description: string;
  image_url: string;
  price: string;
  cost: string;
  sort_order: string;
  is_active: boolean;
  product_type: string;
  min_quantity: string;
  price_per_unit: string;
}

const emptyProductForm: ProductForm = {
  game_id: "",
  name: "",
  description: "",
  image_url: "",
  price: "0",
  cost: "0",
  sort_order: "0",
  is_active: true,
  product_type: "fixed",
  min_quantity: "",
  price_per_unit: "",
};

/* ─── Component ─── */

export default function AdminPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();

  const sectionFromPath = (): Section => {
    const path = location.pathname;
    if (path.includes("/admin/products")) return "products";
    if (path.includes("/admin/transactions")) return "transactions";
    if (path.includes("/admin/settings")) return "settings";
    return "dashboard";
  };

  const [section, setSection] = useState<Section>(sectionFromPath);

  useEffect(() => {
    setSection(sectionFromPath());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Product CRUD state
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Queries
  const { data: txs = [], isLoading: txLoading } = useQuery({
    queryKey: ["admin-tx"],
    queryFn: () => adminListTransactions(),
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => adminListUsers(),
  });

  const { data: games = [], isLoading: gamesLoading, error: gamesError, refetch: refetchGames } = useQuery({
    queryKey: ["admin-games"],
    queryFn: () => adminListGames(),
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => adminListProducts(),
  });

  const handleStatusChange = async (txId: string, newStatus: string) => {
    try {
      await adminUpdateTransactionStatus(txId, newStatus);
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-tx"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update status");
    }
  };

  // Product CRUD handlers
  const openAddProduct = () => {
    setEditingProductId(null);
    setProductForm(emptyProductForm);
    setProductDialogOpen(true);
  };

  const openEditProduct = (p: any) => {
    setEditingProductId(p.id);
    setProductForm({
      game_id: p.game_id ?? (p.games as any)?.id ?? "",
      name: p.name,
      description: p.description ?? "",
      image_url: p.image_url ?? "",
      price: String(p.price ?? 0),
      cost: String(p.cost ?? 0),
      sort_order: String(p.sort_order ?? 0),
      is_active: p.is_active,
      product_type: p.product_type ?? "fixed",
      min_quantity: p.min_quantity != null ? String(p.min_quantity) : "",
      price_per_unit: p.price_per_unit != null ? String(p.price_per_unit) : "",
    });
    setProductDialogOpen(true);
  };

  const openDeleteProduct = (id: string) => {
    setDeletingProductId(id);
    setDeleteDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name.trim()) return toast.error("Product name is required");
    if (!productForm.game_id) return toast.error("Select a game");

    const isCustom = productForm.product_type === "followers" || productForm.product_type === "likes";
    if (isCustom) {
      if (!productForm.price_per_unit || Number(productForm.price_per_unit) <= 0)
        return toast.error("Enter price per unit for this product type");
      if (!productForm.min_quantity || Number(productForm.min_quantity) <= 0)
        return toast.error("Enter minimum quantity");
    } else {
      if (!productForm.price || Number(productForm.price) <= 0)
        return toast.error("Enter a valid price");
    }

    const sharedFields = {
      name: productForm.name,
      description: productForm.description || null,
      image_url: productForm.image_url || null,
      price: isCustom ? 0 : Number(productForm.price),
      cost: Number(productForm.cost),
      sort_order: Number(productForm.sort_order),
      is_active: productForm.is_active,
      product_type: productForm.product_type,
      min_quantity: isCustom && productForm.min_quantity ? Number(productForm.min_quantity) : null,
      price_per_unit: isCustom && productForm.price_per_unit ? Number(productForm.price_per_unit) : null,
    };

    setSaving(true);
    try {
      if (editingProductId) {
        await adminUpdateProduct(editingProductId, { ...sharedFields, game_id: productForm.game_id });
        toast.success("Product updated");
      } else {
        await adminCreateProduct({ game_id: productForm.game_id, ...sharedFields });
        toast.success("Product created");
      }
      setProductDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deletingProductId) return;
    setSaving(true);
    try {
      await adminDeleteProduct(deletingProductId);
      toast.success("Product deleted");
      setDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete product");
    } finally {
      setSaving(false);
    }
  };

  /* ─── Section tabs ─── */
  const sectionItems: { id: Section; label: string; icon: any }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "products", label: "Products", icon: Package },
    { id: "transactions", label: "Transactions", icon: Receipt },
    { id: "settings", label: "Settings", icon: DollarSign },
  ];

  /* ─── Dashboard stats ─── */
  const totalRevenue = (txs as any[]).filter((t) => t.status === "completed").reduce((s, t) => s + Number(t.amount), 0);
  const totalProfit = (txs as any[]).filter((t) => t.status === "completed").reduce((s, t) => s + (Number(t.amount) - Number(t.cost ?? 0)), 0);
  const pendingCount = (txs as any[]).filter((t) => t.status === "waiting_payment" || t.status === "waiting_confirmation").length;
  const completedCount = (txs as any[]).filter((t) => t.status === "completed").length;

  const StatCard = ({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color: string }) => (
    <div className="glass-strong rounded-xl p-5 hover-glow">
      <div className="flex items-center gap-3 mb-3">
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );

  /* ─── Render sections ─── */

  const renderDashboard = () => (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={DollarSign} label="Revenue" value={formatIDR(totalRevenue)} sub={`${completedCount} successful orders`} color="bg-emerald-500/15 text-emerald-300" />
        <StatCard icon={TrendingUp} label="Profit" value={formatIDR(totalProfit)} sub="From successful orders" color="bg-cyan-500/15 text-cyan-300" />
        <StatCard icon={ShoppingCart} label="Pending" value={String(pendingCount)} sub="Awaiting processing" color="bg-yellow-500/15 text-yellow-300" />
        <StatCard icon={Package} label="Products" value={String(products.length)} sub={`${games.length} games`} color="bg-blue-500/15 text-blue-300" />
      </div>

      <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
      {(txs as any[]).length === 0 ? (
        <p className="text-muted-foreground text-sm">No transactions yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="text-muted-foreground text-left">
              <tr className="border-b border-border/50">
                <th className="py-2 pr-3">Order ID</th>
                <th className="py-2 pr-3">Product</th>
                <th className="py-2 pr-3">Amount</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {(txs as any[]).slice(0, 10).map((t) => {
                const StatusIcon = STATUS_ICONS[t.status] ?? Clock;
                return (
                  <tr key={t.id} className="border-b border-border/30">
                    <td className="py-3 pr-3 font-mono text-xs">{t.order_id}</td>
                    <td className="py-3 pr-3">{t.products?.name ?? "—"}</td>
                    <td className="py-3 pr-3 font-medium">{formatIDR(Number(t.amount))}</td>
                    <td className="py-3 pr-3">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLES[t.status] ?? ""}`}>
                        <StatusIcon className={`h-3 w-3 ${t.status === "processing" ? "animate-spin" : ""}`} />
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground text-xs">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderProducts = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button onClick={openAddProduct} className="gap-2 bg-[var(--neon)] text-[oklch(0.08_0.04_258)] hover:bg-[var(--neon)]/90 font-semibold neon-ring">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>
      {gamesError && (
        <div className="glass rounded-xl p-4 mb-4 border border-yellow-500/30 text-yellow-300 text-sm">
          Failed to load games: {gamesError.message}. <button onClick={() => refetchGames()} className="underline">Retry</button>
        </div>
      )}
      {!gamesLoading && games.length === 0 && (
        <div className="glass rounded-xl p-4 mb-4 border border-red-500/30 text-red-300 text-sm">
          No games available. Products require at least one game. <button onClick={() => refetchGames()} className="underline">Refresh</button>
        </div>
      )}
      {productsLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="text-muted-foreground text-left">
              <tr className="border-b border-border/50">
                <th className="py-2 pr-4">Image</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Game</th>
                <th className="py-2 pr-4">Price / Unit</th>
                <th className="py-2 pr-4">Min Qty</th>
                <th className="py-2 pr-4">Active</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(products as any[]).map((p) => {
                const isCustom = p.product_type === "followers" || p.product_type === "likes";
                return (
                  <tr key={p.id} className="border-b border-border/30">
                    <td className="py-3 pr-4">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded-md object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-md bg-secondary/60 grid place-items-center">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-medium">{p.name}</div>
                      {p.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.description}</div>}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-xs capitalize ${PRODUCT_TYPE_BADGES[p.product_type ?? "fixed"] ?? ""}`}>
                        {p.product_type ?? "fixed"}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{(p.games as any)?.name ?? "—"}</td>
                    <td className="py-3 pr-4">
                      {isCustom && p.price_per_unit != null
                        ? <span>{formatIDR(Number(p.price_per_unit))}<span className="text-muted-foreground text-xs"> /unit</span></span>
                        : formatIDR(Number(p.price))}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {p.min_quantity != null ? p.min_quantity.toLocaleString() : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-xs ${p.is_active ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-red-500/15 text-red-300 border-red-500/30"}`}>
                        {p.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditProduct(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300" onClick={() => openDeleteProduct(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-muted-foreground">
                    No products yet. Click "Add Product" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderTransactions = () => (
    <div>
      <h1 className="text-2xl font-bold mb-6">Transactions</h1>
      {txLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="text-muted-foreground text-left">
              <tr className="border-b border-border/50">
                <th className="py-2 pr-3">Order ID</th>
                <th className="py-2 pr-3">Product</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Qty</th>
                <th className="py-2 pr-3">Total</th>
                <th className="py-2 pr-3">User Input</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {(txs as any[]).map((t) => {
                const StatusIcon = STATUS_ICONS[t.status] ?? Clock;
                const ptype = t.products?.product_type ?? "fixed";
                return (
                  <tr key={t.id} className="border-b border-border/30">
                    <td className="py-3 pr-3 font-mono text-xs">{t.order_id}</td>
                    <td className="py-3 pr-3">
                      <div>{t.products?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground font-mono">{t.user_game_id}</div>
                    </td>
                    <td className="py-3 pr-3">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-xs capitalize ${PRODUCT_TYPE_BADGES[ptype] ?? ""}`}>
                        {ptype}
                      </span>
                    </td>
                    <td className="py-3 pr-3 font-medium">
                      {(t.quantity ?? 1).toLocaleString()}
                    </td>
                    <td className="py-3 pr-3 font-medium">{formatIDR(Number(t.amount))}</td>
                    <td className="py-3 pr-3 max-w-[140px]">
                      {t.user_input
                        ? <span className="text-xs text-muted-foreground truncate block" title={t.user_input}>{t.user_input}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-3 pr-3">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLES[t.status] ?? ""}`}>
                        <StatusIcon className={`h-3 w-3 ${t.status === "processing" ? "animate-spin" : ""}`} />
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground text-xs">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-3">
                      <Select value={t.status} onValueChange={(val) => handleStatusChange(t.id, val)}>
                        <SelectTrigger className="h-8 w-[130px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              })}
              {txs.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-muted-foreground">
                    No transactions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderSettings = () => (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="glass-strong rounded-xl p-6 max-w-lg space-y-4">
        <div>
          <Label className="text-sm text-muted-foreground">Admin Email</Label>
          <p className="text-sm font-medium mt-1">{user?.email}</p>
        </div>
        <div>
          <Label className="text-sm text-muted-foreground">Total Users</Label>
          <p className="text-sm font-medium mt-1">{users.length}</p>
        </div>
        <div>
          <Label className="text-sm text-muted-foreground">Total Games</Label>
          <p className="text-sm font-medium mt-1">{games.length}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8">
      {/* Section tabs for mobile / quick nav */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 md:hidden">
        {sectionItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                section === item.id
                  ? "bg-secondary text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" /> {item.label}
            </button>
          );
        })}
      </div>

      {section === "dashboard" && renderDashboard()}
      {section === "products" && renderProducts()}
      {section === "transactions" && renderTransactions()}
      {section === "settings" && renderSettings()}

      {/* Product Add/Edit Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="glass-strong border-border/50 max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProductId ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <Label>Game</Label>
              <Select
                value={productForm.game_id}
                onValueChange={(val) => setProductForm((f) => ({ ...f, game_id: val }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={gamesLoading ? "Loading games..." : games.length === 0 ? "No games available" : "Select a game"} />
                </SelectTrigger>
                <SelectContent>
                  {(games as any[]).length === 0 && !gamesLoading && (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">No games found. Check your connection.</div>
                  )}
                  {(games as any[]).map((g: any) => (
                    <SelectItem key={g.id} value={g.id}>{g.name} <span className="text-muted-foreground text-xs">({g.category ?? ""})</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Product Type</Label>
              <Select
                value={productForm.product_type}
                onValueChange={(val) => setProductForm((f) => ({ ...f, product_type: val }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Package Name</Label>
              <Input
                className="mt-1"
                value={productForm.name}
                onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. 86 Diamonds"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                className="mt-1"
                value={productForm.description}
                onChange={(e) => setProductForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="e.g. 86 Diamonds + 5% bonus"
              />
            </div>
            <div>
              <Label>Image URL</Label>
              <Input
                className="mt-1"
                value={productForm.image_url}
                onChange={(e) => setProductForm((f) => ({ ...f, image_url: e.target.value }))}
                placeholder="https://example.com/image.png"
              />
              {productForm.image_url && (
                <img src={productForm.image_url} alt="Preview" className="mt-2 h-16 w-16 rounded-md object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
            </div>

            {/* Custom quantity fields */}
            {(productForm.product_type === "followers" || productForm.product_type === "likes") ? (
              <div className="rounded-xl border border-[var(--neon)]/20 bg-[var(--neon)]/5 p-4 space-y-3">
                <p className="text-xs font-semibold text-[var(--neon)] uppercase tracking-wider">Custom Quantity Settings</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Price Per Unit (IDR)</Label>
                    <Input
                      className="mt-1"
                      type="number"
                      value={productForm.price_per_unit}
                      onChange={(e) => setProductForm((f) => ({ ...f, price_per_unit: e.target.value }))}
                      placeholder="50"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      e.g. 50 = 100 units costs 5,000
                    </p>
                  </div>
                  <div>
                    <Label>Minimum Quantity</Label>
                    <Input
                      className="mt-1"
                      type="number"
                      value={productForm.min_quantity}
                      onChange={(e) => setProductForm((f) => ({ ...f, min_quantity: e.target.value }))}
                      placeholder={productForm.product_type === "followers" ? "100" : "1000"}
                    />
                  </div>
                </div>
                <div>
                  <Label>Cost Per Unit (IDR)</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    value={productForm.cost}
                    onChange={(e) => setProductForm((f) => ({ ...f, cost: e.target.value }))}
                    placeholder="40"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price (IDR)</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="19000"
                  />
                </div>
                <div>
                  <Label>Cost (IDR)</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    value={productForm.cost}
                    onChange={(e) => setProductForm((f) => ({ ...f, cost: e.target.value }))}
                    placeholder="15000"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sort Order</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={productForm.sort_order}
                  onChange={(e) => setProductForm((f) => ({ ...f, sort_order: e.target.value }))}
                />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <input
                  type="checkbox"
                  checked={productForm.is_active}
                  onChange={(e) => setProductForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="h-4 w-4"
                />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveProduct} disabled={saving} className="bg-[var(--neon)] text-[oklch(0.08_0.04_258)] hover:bg-[var(--neon)]/90 font-semibold">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingProductId ? "Save Changes" : "Create Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="glass-strong border-border/50 max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this product? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteProduct} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
