import { useEffect, useState } from "react";
import { Package, AlertTriangle, TrendingDown } from "lucide-react";
import API from "../api/api";

export default function ProductTable() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await API.get("/analytics/risk");
      console.log("API RESPONSE:", res.data);

      setProducts(Array.isArray(res.data.risk_analysis) 
        ? res.data.risk_analysis 
        : []);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadgeStyles = (riskLevel) => {
    switch(riskLevel) {
      case 'High':
        return 'bg-red-500/10 border-red-500/30 text-red-300';
      case 'Medium':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-300';
      default:
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
    }
  };

  const getRiskIcon = (riskLevel) => {
    if (riskLevel === 'High') return AlertTriangle;
    if (riskLevel === 'Medium') return TrendingDown;
    return Package;
  };

  return (
    <div className="space-y-8 px-4 py-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-4xl font-bold text-white mb-3">Product Inventory</h1>
        <p className="text-slate-400 text-lg">Risk analysis and inventory status</p>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-slate-800/50 rounded-lg skeleton" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="chart-container flex flex-col items-center justify-center py-16">
          <Package className="w-12 h-12 text-slate-400 mb-4" />
          <p className="text-slate-400 text-lg">No products found</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-800 shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Table Header */}
              <thead>
                <tr className="bg-gradient-to-r from-slate-800 to-slate-900/50 border-b border-slate-700">
                  <th className="px-8 py-5 text-left text-sm font-semibold text-slate-200">Product Name</th>
                  <th className="px-8 py-5 text-right text-sm font-semibold text-slate-200">Selling Price</th>
                  <th className="px-8 py-5 text-right text-sm font-semibold text-slate-200">Cost Price</th>
                  <th className="px-8 py-5 text-right text-sm font-semibold text-slate-200">Stock</th>
                  <th className="px-8 py-5 text-left text-sm font-semibold text-slate-200">Risk Level</th>
                  <th className="px-8 py-5 text-right text-sm font-semibold text-slate-200">Score</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-800">
                {products.map((product, index) => {
                  const RiskIcon = getRiskIcon(product.risk_level);
                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Product Name */}
                      <td className="px-8 py-5">
                        <div className="font-medium text-white">{product.name}</div>
                        <div className="text-xs text-slate-400 mt-1">ID: {product.id}</div>
                      </td>

                      {/* Selling Price */}
                      <td className="px-8 py-5 text-right">
                        {typeof product.selling_price !== 'undefined' && product.selling_price !== null
                          ? <span className="font-semibold text-emerald-400">₹{product.selling_price.toFixed(2)}</span>
                          : <span className="text-slate-400">—</span>}
                      </td>

                      {/* Cost Price */}
                      <td className="px-8 py-5 text-right">
                        <span className="text-slate-300">₹{product.cost_price.toFixed(2)}</span>
                      </td>

                      {/* Stock */}
                      <td className="px-8 py-5 text-right">
                        {typeof product.current_stock !== 'undefined' && product.current_stock !== null
                          ? <span className="font-semibold text-white">{product.current_stock}</span>
                          : <span className="text-slate-400">—</span>}
                      </td>

                      {/* Risk Level */}
                      <td className="px-8 py-5">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${getRiskBadgeStyles(product.risk_level)}`}>
                          <RiskIcon className="w-4 h-4" />
                          {product.risk_level}
                        </div>
                      </td>

                      {/* Risk Score */}
                      <td className="px-8 py-5 text-right">
                        {typeof product.risk_score !== 'undefined' ? (
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  product.risk_score > 75 ? 'bg-red-500' :
                                  product.risk_score > 50 ? 'bg-amber-500' :
                                  'bg-emerald-500'
                                }`}
                                style={{ width: `${product.risk_score}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-slate-300 w-8">{product.risk_score}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {!loading && products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <div className="kpi-card">
            <p className="text-sm text-slate-400 mb-2">Total Products</p>
            <p className="text-2xl font-bold text-white">{products.length}</p>
          </div>
          <div className="kpi-card">
            <p className="text-sm text-slate-400 mb-2">High Risk</p>
            <p className="text-2xl font-bold text-red-400">{products.filter(p => p.risk_level === 'High').length}</p>
          </div>
          <div className="kpi-card">
            <p className="text-sm text-slate-400 mb-2">Medium Risk</p>
            <p className="text-2xl font-bold text-amber-400">{products.filter(p => p.risk_level === 'Medium').length}</p>
          </div>
          <div className="kpi-card">
            <p className="text-sm text-slate-400 mb-2">Low Risk</p>
            <p className="text-2xl font-bold text-emerald-400">{products.filter(p => p.risk_level === 'Low').length}</p>
          </div>
        </div>
      )}
    </div>
  );
}