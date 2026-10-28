import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Plus,
  Search,
  Package,
  Pencil,
  Eye,
  EyeOff,
  RefreshCw,
  X,
  LogOut,
  LayoutDashboard,
  AlertCircle,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL;
const PRODUCT_API = `${API.replace(/\/+$/, "")}/api/products`;

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  shortDescription: "",
  department: "pet_shop",
  category: "",
  subcategory: "",
  brand: "",
  price: "",
  compareAtPrice: "",
  currency: "INR",
  sku: "",
  stock: "0",
  images: "",
  specifications: "{}",
  requiresPrescription: false,
  manufacturer: "",
  activeIngredient: "",
  dosageForm: "",
  strength: "",
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

function AdminDashboard() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const accessToken = useSelector((state) => state.auth.accessToken);

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [publication, setPublication] = useState("all");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  const headers = useCallback(
    (json = false) => ({
      ...(json ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }),
    [accessToken],
  );

  const request = useCallback(
    async (path, options = {}) => {
      const response = await fetch(`${PRODUCT_API}${path}`, {
        credentials: "include",
        ...options,
        headers: {
          ...headers(Boolean(options.body)),
          ...options.headers,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        throw new Error("Your session has expired. Please log in again.");
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.errors?.join?.(" ") ||
            "The request could not be completed.",
        );
      }

      return data;
    },
    [headers],
  );

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "100",
      });

      if (department !== "all") {
        params.set("department", department);
      }

      if (publication !== "all") {
        params.set(
          "isPublished",
          publication === "published" ? "true" : "false",
        );
      }

      const data = await request(`/admin/all?${params.toString()}`);

      setProducts(data.products || []);
      setTotalPages(Math.max(1, data.pagination?.totalPages || 1));
      setTotalProducts(data.pagination?.total || 0);
    } catch (err) {
      setError(err.message);

      if (err.message.includes("session has expired")) {
        navigate("/admin/login", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [request, page, department, publication, navigate]);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/admin/login", { replace: true });
      return;
    }

    loadProducts();
  }, [user, loadProducts, navigate]);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return products;

    return products.filter((product) =>
      [product.name, product.sku, product.category, product.brand].some(
        (value) =>
          String(value || "")
            .toLowerCase()
            .includes(query),
      ),
    );
  }, [products, search]);

  const publishedCount = products.filter((p) => p.isPublished).length;
  const draftCount = products.filter((p) => !p.isPublished).length;

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setError("");
    setNotice("");
    setModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setError("");
    setNotice("");

    setForm({
      ...emptyForm,
      name: product.name || "",
      slug: product.slug || "",
      description: product.description || "",
      shortDescription: product.shortDescription || "",
      department: product.department || "pet_shop",
      category: product.category || "",
      subcategory: product.subcategory || "",
      brand: product.brand || "",
      price: String(product.price ?? ""),
      compareAtPrice:
        product.compareAtPrice == null ? "" : String(product.compareAtPrice),
      currency: product.currency || "INR",
      sku: product.sku || "",
      stock: String(product.stock ?? 0),
      images: (product.images || []).map((img) => img.url).join("\n"),
      specifications: JSON.stringify(product.specifications || {}, null, 2),
      requiresPrescription:
        product.pharmacyDetails?.requiresPrescription || false,
      manufacturer: product.pharmacyDetails?.manufacturer || "",
      activeIngredient: product.pharmacyDetails?.activeIngredient || "",
      dosageForm: product.pharmacyDetails?.dosageForm || "",
      strength: product.pharmacyDetails?.strength || "",
    });

    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");

    let specifications;

    try {
      specifications = JSON.parse(form.specifications || "{}");

      if (
        !specifications ||
        typeof specifications !== "object" ||
        Array.isArray(specifications)
      ) {
        throw new Error("Specifications must be a JSON object.");
      }

      if (
        Object.values(specifications).some((value) => typeof value !== "string")
      ) {
        throw new Error("Specification values must all be strings.");
      }
    } catch (err) {
      setError(err.message || "Invalid specifications JSON.");
      return;
    }

    const price = Number(form.price);
    const stock = Number(form.stock);
    const compareAtPrice =
      form.compareAtPrice.trim() === "" ? null : Number(form.compareAtPrice);

    if (!Number.isFinite(price) || price < 0) {
      setError("Enter a valid non-negative selling price.");
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      setError("Stock must be a non-negative whole number.");
      return;
    }

    if (
      compareAtPrice !== null &&
      (!Number.isFinite(compareAtPrice) || compareAtPrice < price)
    ) {
      setError(
        "Compare-at price must be greater than or equal to the selling price.",
      );
      return;
    }

    const images = form.images
      .split("\n")
      .map((url) => url.trim())
      .filter(Boolean)
      .map((url) => ({ url, alt: form.name.trim() }));

    const pharmacyDetails =
      form.department === "pharmacy"
        ? {
            requiresPrescription: form.requiresPrescription,
            manufacturer: form.manufacturer.trim(),
            activeIngredient: form.activeIngredient.trim(),
            dosageForm: form.dosageForm.trim(),
            strength: form.strength.trim(),
          }
        : undefined;

    const body = {
      name: form.name.trim(),
      description: form.description.trim(),
      shortDescription: form.shortDescription.trim(),
      department: form.department,
      category: form.category.trim(),
      subcategory: form.subcategory.trim(),
      brand: form.brand.trim(),
      price,
      compareAtPrice,
      currency: form.currency.trim().toUpperCase() || "INR",
      sku: form.sku.trim().toUpperCase(),
      stock,
      images,
      specifications,
      ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
      ...(pharmacyDetails ? { pharmacyDetails } : {}),
    };

    setSaving(true);

    try {
      const data = await request(
        editingProduct ? `/${editingProduct._id}` : "/",
        {
          method: editingProduct ? "PATCH" : "POST",
          body: JSON.stringify(body),
        },
      );

      setNotice(data.message || "Product saved successfully.");
      setModalOpen(false);
      await loadProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const togglePublication = async (product) => {
    setError("");
    setNotice("");
    setActionId(product._id);

    try {
      const endpoint = product.isPublished
        ? `/${product._id}/unpublish`
        : `/${product._id}/publish`;

      const data = await request(endpoint, { method: "PATCH" });

      setNotice(data.message || "Product publication status updated.");
      await loadProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API}/auth/logout/`, {
        method: "POST",
        credentials: "include",
        headers: headers(),
      });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // Also clear the Redux auth state here if your slice has a logout action.
      navigate("/admin/login", { replace: true });
      window.location.reload();
    }
  };

  if (!user || user.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* TOP BAR */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <img
                src="/logo.png"
                alt="LovoPet Logo"
                className="h-full w-full object-contain"
              />
            </div>

            <div>
              <h1 className="text-lg font-bold">LovoPet Admin</h1>
              <p className="text-xs text-slate-500">Product management</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{user.name || "Admin"}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-2xl space-y-6 px-4 py-7 sm:px-6 lg:px-8">
        {/* PAGE HEADING */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold">Products</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create, update and publish products to your storefront.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
          >
            <Plus size={18} />
            Add Product
          </button>
        </div>

        {/* FEEDBACK */}
        {error && !modalOpen && (
          <div
            role="alert"
            className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            {notice}
          </div>
        )}

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              label: "Products on this page",
              value: totalProducts,
              icon: Package,
            },
            {
              label: "Published on this page",
              value: publishedCount,
              icon: Eye,
            },
            {
              label: "Drafts on this page",
              value: draftCount,
              icon: EyeOff,
            },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <Icon size={22} />
              </div>
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-bold">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* FILTERS */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, SKU, category or brand..."
                className={`${inputClass} pl-10`}
              />
            </div>

            <select
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setPage(1);
              }}
              className={`${inputClass} lg:w-48`}
              aria-label="Filter by department"
            >
              <option value="all">All departments</option>
              <option value="pet_shop">Pet shop</option>
              <option value="pharmacy">Pharmacy</option>
            </select>

            <select
              value={publication}
              onChange={(e) => {
                setPublication(e.target.value);
                setPage(1);
              }}
              className={`${inputClass} lg:w-48`}
              aria-label="Filter by publication"
            >
              <option value="all">All publication states</option>
              <option value="published">Published</option>
              <option value="draft">Drafts</option>
            </select>

            <button
              onClick={loadProducts}
              disabled={loading}
              title="Refresh products"
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {/* PRODUCT TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Product</th>
                  <th className="px-5 py-4 font-semibold">Department</th>
                  <th className="px-5 py-4 font-semibold">Price</th>
                  <th className="px-5 py-4 font-semibold">Stock</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-5 py-16 text-center text-slate-500"
                    >
                      Loading products...
                    </td>
                  </tr>
                ) : visibleProducts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-16 text-center">
                      <Package
                        className="mx-auto mb-3 text-slate-300"
                        size={35}
                      />
                      <p className="font-medium">No products found</p>
                      <p className="mt-1 text-slate-500">
                        Add a product or change your search filters.
                      </p>
                    </td>
                  </tr>
                ) : (
                  visibleProducts.map((product) => (
                    <tr key={product._id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                            {product.images?.[0]?.url ? (
                              <img
                                src={product.images[0].url}
                                alt={product.images[0].alt || product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package size={20} className="text-slate-400" />
                            )}
                          </div>

                          <div className="max-w-xs">
                            <p className="font-semibold text-slate-900">
                              {product.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              SKU: {product.sku}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {product.category}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 capitalize">
                        {product.department === "pet_shop"
                          ? "Pet shop"
                          : "Pharmacy"}
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {product.currency || "INR"}{" "}
                        {Number(product.price).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium">{product.stock}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {product.stockStatus?.replaceAll("_", " ")}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            product.isPublished
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {product.isPublished ? "Published" : "Draft"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(product)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-100"
                          >
                            <Pencil size={14} />
                            Edit
                          </button>

                          <button
                            onClick={() => togglePublication(product)}
                            disabled={actionId === product._id}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
                              product.isPublished
                                ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                : "bg-orange-500 text-white hover:bg-orange-600"
                            }`}
                          >
                            {product.isPublished ? (
                              <EyeOff size={14} />
                            ) : (
                              <Eye size={14} />
                            )}
                            {actionId === product._id
                              ? "Saving..."
                              : product.isPublished
                                ? "Unpublish"
                                : "Publish"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              {totalProducts} total products · Page {page} of {totalPages}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm disabled:opacity-40"
              >
                Previous
              </button>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) {
              setModalOpen(false);
              setError("");
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-modal-title"
            className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
              <div>
                <h2 id="product-modal-title" className="text-xl font-bold">
                  {editingProduct ? "Edit product" : "Add new product"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingProduct
                    ? "Update product details and save your changes."
                    : "New products start as drafts until published."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!saving) {
                    setModalOpen(false);
                    setError("");
                  }
                }}
                disabled={saving}
                aria-label="Close modal"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="max-h-[70vh] space-y-6 overflow-y-auto px-5 py-6 sm:px-7">
                {error && (
                  <div
                    role="alert"
                    className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                  >
                    {error}
                  </div>
                )}

                {/* BASIC DETAILS */}
                <section className="space-y-4">
                  <h3 className="font-semibold">Basic information</h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Product name *</label>
                      <input
                        className={inputClass}
                        value={form.name}
                        onChange={(e) => updateForm("name", e.target.value)}
                        maxLength={200}
                        required
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Slug (optional)</label>
                      <input
                        className={inputClass}
                        placeholder="Auto-generated from name"
                        value={form.slug}
                        onChange={(e) => updateForm("slug", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Brand</label>
                      <input
                        className={inputClass}
                        value={form.brand}
                        onChange={(e) => updateForm("brand", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Department *</label>
                      <select
                        className={inputClass}
                        value={form.department}
                        onChange={(e) =>
                          updateForm("department", e.target.value)
                        }
                      >
                        <option value="pet_shop">Pet shop</option>
                        <option value="pharmacy">Pharmacy</option>
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Category *</label>
                      <input
                        className={inputClass}
                        value={form.category}
                        onChange={(e) => updateForm("category", e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Subcategory</label>
                      <input
                        className={inputClass}
                        value={form.subcategory}
                        onChange={(e) =>
                          updateForm("subcategory", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label className={labelClass}>SKU *</label>
                      <input
                        className={inputClass}
                        value={form.sku}
                        onChange={(e) => updateForm("sku", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Short description</label>
                    <textarea
                      className={inputClass}
                      rows={2}
                      maxLength={300}
                      value={form.shortDescription}
                      onChange={(e) =>
                        updateForm("shortDescription", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Full description *</label>
                    <textarea
                      className={inputClass}
                      rows={4}
                      value={form.description}
                      onChange={(e) =>
                        updateForm("description", e.target.value)
                      }
                      required
                    />
                  </div>
                </section>

                {/* PRICING & STOCK */}
                <section className="space-y-4 border-t border-slate-100 pt-5">
                  <h3 className="font-semibold">Pricing and inventory</h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Selling price (₹) *</label>
                      <input
                        className={inputClass}
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={(e) => updateForm("price", e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Compare-at price (₹)</label>
                      <input
                        className={inputClass}
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.compareAtPrice}
                        onChange={(e) =>
                          updateForm("compareAtPrice", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Currency</label>
                      <input
                        className={inputClass}
                        value={form.currency}
                        onChange={(e) => updateForm("currency", e.target.value)}
                        maxLength={3}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Stock quantity *</label>
                      <input
                        className={inputClass}
                        type="number"
                        min="0"
                        step="1"
                        value={form.stock}
                        onChange={(e) => updateForm("stock", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </section>

                {/* IMAGES */}
                <section className="space-y-3 border-t border-slate-100 pt-5">
                  <h3 className="font-semibold">Product images</h3>
                  <div>
                    <label className={labelClass}>Image URLs</label>
                    <textarea
                      className={inputClass}
                      rows={3}
                      placeholder={
                        "https://example.com/product.jpg\nhttps://example.com/product-2.jpg"
                      }
                      value={form.images}
                      onChange={(e) => updateForm("images", e.target.value)}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Enter one publicly accessible image URL per line. This
                      form does not upload files.
                    </p>
                  </div>
                </section>

                {/* SPECIFICATIONS */}
                <section className="space-y-3 border-t border-slate-100 pt-5">
                  <h3 className="font-semibold">Specifications</h3>
                  <div>
                    <label className={labelClass}>Specifications as JSON</label>
                    <textarea
                      className={`${inputClass} font-mono text-xs`}
                      rows={4}
                      placeholder={
                        '{\n  "Material": "Cotton",\n  "Size": "Medium"\n}'
                      }
                      value={form.specifications}
                      onChange={(e) =>
                        updateForm("specifications", e.target.value)
                      }
                    />
                  </div>
                </section>

                {/* PHARMACY DETAILS */}
                {form.department === "pharmacy" && (
                  <section className="space-y-4 border-t border-slate-100 pt-5">
                    <h3 className="font-semibold">Pharmacy details</h3>

                    <label className="flex items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={form.requiresPrescription}
                        onChange={(e) =>
                          updateForm("requiresPrescription", e.target.checked)
                        }
                        className="h-4 w-4 accent-orange-500"
                      />
                      Prescription required
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {[
                        ["manufacturer", "Manufacturer"],
                        ["activeIngredient", "Active ingredient"],
                        ["dosageForm", "Dosage form"],
                        ["strength", "Strength"],
                      ].map(([key, label]) => (
                        <div key={key}>
                          <label className={labelClass}>{label}</label>
                          <input
                            className={inputClass}
                            value={form[key]}
                            onChange={(e) => updateForm(key, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setError("");
                  }}
                  disabled={saving}
                  className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingProduct
                      ? "Save changes"
                      : "Create draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
