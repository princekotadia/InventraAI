import { useEffect, useState } from "react";
import { Zap, TrendingUp, ArrowUp, ArrowDown, Loader } from "lucide-react";
import API from "../api/api";

export default function Simulation() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    product_id: "",
    new_price: "",
    new_stock: ""
  });

  const [baseline, setBaseline] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const id = parseInt(form.product_id);
    if (!id) {
      setBaseline(null);
      return;
    }

    const prod = products.find((p) => p.id === id);
    if (!prod) return;

    (async () => {
      try {
        const res = await API.post("/analytics/simulate", {
          product_id: id,
          new_price: parseFloat(prod.selling_price),
          new_stock: parseInt(prod.current_stock)
        });
        setBaseline(res.data);
      } catch (err) {
        setBaseline(null);
      }
    })();
  }, [form.product_id, products]);

  const fetchProducts = async () => {
    try {
      const res = await API.get("/products/");
      setProducts(res.data);
    } catch (err) {
      setProducts([]);
    }
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const runSimulation = async (payload) => {
    setLoading(true);
    try {
      const res = await API.post("/analytics/simulate", payload);
      setResult(res.data);
    } catch (err) {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.product_id) return;

    await runSimulation({
      product_id: parseInt(form.product_id),
      new_price: parseFloat(form.new_price),
      new_stock: parseInt(form.new_stock)
    });
  };

  const applyScenario = async (pricePct = 0, stockPct = 0) => {
    const id = parseInt(form.product_id);
    if (!id) return;
    const prod = products.find((p) => p.id === id);
    if (!prod) return;

    const new_price = +(prod.selling_price * (1 + pricePct / 100)).toFixed(2);
    const new_stock = Math.max(0, Math.round(prod.current_stock * (1 + stockPct / 100)));

    setForm({ ...form, new_price, new_stock });

    await runSimulation({ product_id: id, new_price, new_stock });
  };

  const delta = baseline && result ? {
    revenue_change: result.simulated_revenue - baseline.simulated_revenue,
    profit_change: result.simulated_profit - baseline.simulated_profit
  } : null;

  const selectedProduct = products.find(p => p.id === parseInt(form.product_id));

  return (
    <div className="space-y-8 px-4 py-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-4xl font-bold text-white mb-3">What-If Simulation</h1>
        <p className="text-slate-400 text-lg">Test different pricing and stock scenarios to optimize profits</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Simulation Controls */}
        <div className="lg:col-span-2">
          <div className="chart-container p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-8">
              <Zap className="w-6 h-6 text-amber-400" />
              <div>
                <h2 className="text-2xl font-bold text-white">Run Simulation</h2>
                <p className="text-sm text-slate-400 mt-1">Adjust parameters and see impact</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Product Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-3">Select Product *</label>
                <select
                  name="product_id"
                  value={form.product_id}
                  onChange={handleChange}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
                  required
                >
                  <option value="">Choose a product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - ₹{p.selling_price} (Stock: {p.current_stock})
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Values */}
              {selectedProduct && (
                <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-lg">
                  <p className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wide">Current Values</p>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <p className="text-sm text-slate-400">Price</p>
                      <p className="text-lg font-bold text-emerald-400">₹{selectedProduct.selling_price}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Stock</p>
                      <p className="text-lg font-bold text-blue-400">{selectedProduct.current_stock} units</p>
                    </div>
                  </div>
                </div>
              )}

              {/* New Values */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-4">Test Values</label>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">New Price (₹)</label>
                    <input
                      type="number"
                      name="new_price"
                      placeholder="0.00"
                      value={form.new_price}
                      onChange={handleChange}
                      step="0.01"
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">New Stock (Units)</label>
                    <input
                      type="number"
                      name="new_stock"
                      placeholder="0"
                      value={form.new_stock}
                      onChange={handleChange}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Quick Scenarios */}
              <div>
                <p className="text-sm font-semibold text-slate-200 mb-4">Quick Scenarios</p>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => applyScenario(10, 0)}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    +10% Price
                  </button>
                  <button
                    type="button"
                    onClick={() => applyScenario(-10, 0)}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    -10% Price
                  </button>
                  <button
                    type="button"
                    onClick={() => applyScenario(0, 20)}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    +20% Stock
                  </button>
                </div>
              </div>

              {/* Run Simulation Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-slate-700 disabled:to-slate-700 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 mt-8 shadow-lg hover:shadow-purple-500/20"
              >
                {loading && <Loader className="w-4 h-4 animate-spin" />}
                {loading ? 'Running Simulation...' : 'Run Simulation'}
              </button>
            </form>
          </div>
        </div>

        {/* Results Panel */}
        <div className="space-y-6">
          {/* Baseline */}
          {baseline && (
            <div className="chart-container p-6">
              <h3 className="font-semibold text-white mb-5 text-lg">Baseline (Current)</h3>
              <div className="space-y-4">
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                  <p className="text-xs text-slate-400 font-medium">Revenue</p>
                  <p className="text-2xl font-bold text-slate-200 mt-2">₹{baseline.simulated_revenue.toFixed(2)}</p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                  <p className="text-xs text-slate-400 font-medium">Profit</p>
                  <p className="text-2xl font-bold text-slate-200 mt-2">₹{baseline.simulated_profit.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Simulation Result */}
          {result && (
            <div className="chart-container p-6 border border-emerald-500/30">
              <h3 className="font-semibold text-white mb-5 text-lg">Simulation Result</h3>
              <div className="space-y-4">>
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-lg">
                  <p className="text-xs text-emerald-400 font-medium">Revenue</p>
                  <p className="text-2xl font-bold text-emerald-300 mt-2">₹{result.simulated_revenue.toFixed(2)}</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-lg">
                  <p className="text-xs text-emerald-400 font-medium">Profit</p>
                  <p className="text-2xl font-bold text-emerald-300 mt-2">₹{result.simulated_profit.toFixed(2)}</p>
                </div>

                {/* Deltas */}
                {delta && (
                  <div className="pt-4 border-t border-slate-700 space-y-3">
                    <div
                      className={`flex items-center gap-3 p-4 rounded-lg ${
                        delta.revenue_change >= 0
                          ? 'bg-emerald-500/10 border border-emerald-500/30'
                          : 'bg-red-500/10 border border-red-500/30'
                      }`}
                    >
                      {delta.revenue_change >= 0 ? (
                        <ArrowUp className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <ArrowDown className="w-4 h-4 text-red-400" />
                      )}
                      <div>
                        <p className="text-xs text-slate-400">Revenue Change</p>
                        <p className={`font-bold ${delta.revenue_change >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                          {delta.revenue_change >= 0 ? '+' : ''}₹{delta.revenue_change.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`flex items-center gap-3 p-4 rounded-lg ${
                        delta.profit_change >= 0
                          ? 'bg-emerald-500/10 border border-emerald-500/30'
                          : 'bg-red-500/10 border border-red-500/30'
                      }`}
                    >
                      {delta.profit_change >= 0 ? (
                        <ArrowUp className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <ArrowDown className="w-4 h-4 text-red-400" />
                      )}
                      <div>
                        <p className="text-xs text-slate-400">Profit Change</p>
                        <p className={`font-bold ${delta.profit_change >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                          {delta.profit_change >= 0 ? '+' : ''}₹{delta.profit_change.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}