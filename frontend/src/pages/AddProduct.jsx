import { useState } from "react";
import { Upload, AlertCircle, CheckCircle, Loader } from "lucide-react";
import API from "../api/api";

export default function AddProduct() {
  const [form, setForm] = useState({
    name: "",
    selling_price: "",
    cost_price: "",
    current_stock: "",
    expiry_date: ""
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

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
      await API.post("/products/", {
        name: form.name,
        selling_price: parseFloat(form.selling_price),
        cost_price: parseFloat(form.cost_price),
        current_stock: parseInt(form.current_stock),
        expiry_date: form.expiry_date || undefined
      });

      setMessage({ type: 'success', text: 'Product added successfully ✅' });

      setForm({
        name: "",
        selling_price: "",
        cost_price: "",
        current_stock: "",
        expiry_date: ""
      });

      setTimeout(() => setMessage(null), 3000);

    } catch (error) {
      console.error("Error adding product:", error);
      setMessage({ type: 'error', text: 'Failed to add product ❌' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    setFile(f || null);
    setParsed(null);
    if (f) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  };

  const handleParseBill = async () => {
    if (!file) return setMessage({ type: 'error', text: 'Please choose an image file' });
    setParsing(true);
    setParsed(null);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append('mode', 'purchase');
      fd.append('file', file);
      const resp = await API.post('/vision/parse_bill', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setParsed(resp.data);
      setMessage({ type: 'success', text: 'Bill parsed successfully' });
    } catch (err) {
      console.error('Parse failed', err);
      setMessage({ type: 'error', text: 'Failed to parse bill' });
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="space-y-8 px-4 py-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-4xl font-bold text-white mb-3">Add Product</h1>
        <p className="text-slate-400 text-lg">Add new products manually or upload a vendor bill</p>
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
        {/* Bill Parser */}
        <div className="chart-container p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-8">
            <Upload className="w-6 h-6 text-purple-400 flex-shrink-0" />
            <div>
              <h2 className="text-2xl font-bold text-white">Parse Bill</h2>
              <p className="text-sm text-slate-400 mt-1">Upload vendor bill photo</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 hover:border-purple-500 hover:bg-purple-500/5 transition-all cursor-pointer">
              <input
                id="billFile"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="billFile" className="block cursor-pointer">
                <div className="flex flex-col items-center gap-4">
                  <Upload className="w-10 h-10 text-slate-400" />
                  <div className="text-center">
                    <p className="font-semibold text-white text-lg">Click to upload or drag and drop</p>
                    <p className="text-sm text-slate-400 mt-2">PNG, JPG, GIF up to 10MB</p>
                  </div>
                </div>
              </label>
            </div>

            {file && (
              <div className="bg-slate-800/50 p-5 rounded-lg border border-slate-700/50">
                <p className="text-sm font-medium text-white mb-3 truncate">📄 {file.name}</p>
                {preview && (
                  <img src={preview} alt="preview" className="max-h-56 w-full rounded-lg border border-slate-600 object-cover" />
                )}
              </div>
            )}

            <button
              onClick={handleParseBill}
              disabled={parsing || !file}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-slate-700 disabled:to-slate-700 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-purple-500/20"
            >
              {parsing && <Loader className="w-5 h-5 animate-spin" />}
              {parsing ? 'Parsing Bill...' : 'Parse Bill & Apply'}
            </button>

            {parsed && (
              <div className="bg-slate-800/50 border border-slate-700/50 p-5 rounded-lg">
                <h3 className="font-semibold text-white mb-4">✅ Parsed Items</h3>
                <pre className="text-xs text-slate-300 overflow-auto max-h-48 bg-slate-900/50 p-4 rounded border border-slate-700">
                  {JSON.stringify(parsed.items || parsed, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Manual Entry Form */}
        <div className="chart-container p-6 lg:p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">Manual Entry</h2>
            <p className="text-sm text-slate-400 mt-1">Add product details directly</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-3">Product Name *</label>
              <input
                type="text"
                name="name"
                placeholder="e.g., Premium Wheat Flour 5kg"
                value={form.name}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-3">Cost Price (₹) *</label>
                <input
                  type="number"
                  name="cost_price"
                  placeholder="0.00"
                  value={form.cost_price}
                  onChange={handleChange}
                  step="0.01"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-3">Selling Price (₹) *</label>
                <input
                  type="number"
                  name="selling_price"
                  placeholder="0.00"
                  value={form.selling_price}
                  onChange={handleChange}
                  step="0.01"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-3">Current Stock (Units) *</label>
              <input
                type="number"
                name="current_stock"
                placeholder="0"
                value={form.current_stock}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-3">Expiry Date (Optional)</label>
              <input
                type="date"
                name="expiry_date"
                value={form.expiry_date}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-700 disabled:to-slate-700 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 mt-8 shadow-lg hover:shadow-emerald-500/20"
            >
              {submitting && <Loader className="w-5 h-5 animate-spin" />}
              {submitting ? 'Adding Product...' : 'Add Product'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 