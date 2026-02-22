import { useEffect, useState } from "react";
import { ShoppingCart, Upload, AlertCircle, CheckCircle, Loader } from "lucide-react";
import API from "../api/api";

export default function AddSale() {
  const [products, setProducts] = useState([]);
  const [csvName, setCsvName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    product_id: "",
    quantity_sold: "",
    sale_date: today
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await API.get("/products/");
      setProducts(res.data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      await API.post("/sales/", {
        product_id: parseInt(form.product_id),
        quantity_sold: parseInt(form.quantity_sold),
        sale_date: form.sale_date
      });

      setMessage({ type: 'success', text: 'Sale added successfully ✅' });

      setForm({
        product_id: "",
        quantity_sold: "",
        sale_date: today
      });

      setTimeout(() => setMessage(null), 3000);

    } catch (error) {
      console.error("Error adding sale:", error);
      setMessage({ type: 'error', text: 'Failed to add sale ❌' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCsvName(file.name);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await API.post("/sales/upload_csv", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setMessage({
        type: 'success',
        text: `Import complete: ${res.data.sales_imported} sales imported, ${res.data.created_products} products created`
      });
      fetchProducts();
    } catch (err) {
      console.error("CSV upload failed", err);
      setMessage({ type: 'error', text: 'CSV upload failed' });
    }
  };

  return (
    <div className="space-y-8 px-4 py-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-4xl font-bold text-white mb-3">Add Sale</h1>
        <p className="text-slate-400 text-lg">Record a sale or import sales data from CSV</p>
      </div>

      {/* Message Alert */}
      {message && (
        <div
          className={`flex items-center gap-4 p-5 rounded-lg border mb-6 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-6 h-6 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
          )}
          <span className="text-base">{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Manual Sale Entry */}
        <div className="chart-container p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-8">
            <ShoppingCart className="w-6 h-6 text-blue-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">Record Sale</h2>
              <p className="text-sm text-slate-400 mt-1">Add a single sale manually</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-3">Select Product *</label>
              <select
                name="product_id"
                value={form.product_id}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                required
              >
                <option value="">Choose a product...</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} (₹{product.selling_price})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-3">Quantity Sold *</label>
              <input
                type="number"
                name="quantity_sold"
                placeholder="e.g., 5"
                value={form.quantity_sold}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-3">Sale Date *</label>
              <input
                type="date"
                name="sale_date"
                value={form.sale_date}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-slate-700 disabled:to-slate-700 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 mt-8 shadow-lg hover:shadow-blue-500/20"
            >
              {submitting && <Loader className="w-4 h-4 animate-spin" />}
              {submitting ? 'Adding...' : 'Add Sale'}
            </button>
          </form>
        </div>

        {/* CSV Upload */}
        <div className="chart-container p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-8">
            <Upload className="w-6 h-6 text-amber-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">Import CSV</h2>
              <p className="text-sm text-slate-400 mt-1">Bulk upload sales data</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 hover:border-amber-500 hover:bg-amber-500/5 transition-all cursor-pointer">
              <input id="csv-upload" type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              <label htmlFor="csv-upload" className="block cursor-pointer">
                <div className="flex flex-col items-center gap-3">
                  <Upload className="w-8 h-8 text-slate-400" />
                  <div className="text-center">
                    <p className="font-semibold text-white">Click to upload or drag and drop</p>
                    <p className="text-sm text-slate-400">CSV file</p>
                  </div>
                </div>
              </label>
            </div>

            {csvName && (
              <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-lg">
                <p className="text-sm font-medium text-emerald-400">✓ {csvName}</p>
              </div>
            )}

            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-5">
              <p className="text-xs font-medium text-slate-300 mb-2">CSV Format</p>
              <p className="text-xs text-slate-400">
                Columns: <code className="text-purple-400">product_id</code> (or <code className="text-purple-400">product_name</code>), <code className="text-purple-400">quantity_sold</code>, <code className="text-purple-400">sale_date</code> (YYYY-MM-DD)
              </p>
              <p className="text-xs text-slate-400 mt-2">
                If product_name doesn't exist, it will be created automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}