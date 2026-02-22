import { useEffect, useState } from "react";
import { TrendingUp, AlertTriangle, Zap, Activity } from "lucide-react";
import API from "../api/api";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  ComposedChart
} from "recharts";

export default function Dashboard() {
  const [profitData, setProfitData] = useState(null);
  const [rebalance, setRebalance] = useState([]);
  const [cashflow, setCashflow] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  const chartData = profitData
    ? [
        {
          name: "Next 7 Days",
          Revenue: profitData.total_predicted_revenue,
          Profit: profitData.total_predicted_profit,
        },
      ]
    : [];

  const trendData = (profitData && profitData.trend) ? profitData.trend : (
    profitData
      ? [
          { day: "Mon", revenue: profitData.total_predicted_revenue * 0.12 },
          { day: "Tue", revenue: profitData.total_predicted_revenue * 0.15 },
          { day: "Wed", revenue: profitData.total_predicted_revenue * 0.18 },
          { day: "Thu", revenue: profitData.total_predicted_revenue * 0.14 },
          { day: "Fri", revenue: profitData.total_predicted_revenue * 0.16 },
          { day: "Sat", revenue: profitData.total_predicted_revenue * 0.13 },
          { day: "Sun", revenue: profitData.total_predicted_revenue * 0.12 }
        ]
      : []
  );

  const deadCount = cashflow && Array.isArray(cashflow.dead_stock_products)
    ? cashflow.dead_stock_products.length
    : 0;

  const pieData = cashflow
    ? [
        { name: "Active Stock", value: Math.max(0, 100 - deadCount * 10) },
        { name: "Dead Stock", value: deadCount * 10 }
      ]
    : [];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const metricsRes = await API.get("/analytics/metrics");
        const trendRes = await API.get("/analytics/revenue_trend");
        const rebalanceRes = await API.get("/analytics/rebalance");
        const insightsRes = await API.get("/analytics/insights_nl");
        const cashflowRes = await API.get("/analytics/cashflow_guardian");

        setProfitData({
          total_predicted_revenue: metricsRes.data.total_revenue,
          total_predicted_profit: metricsRes.data.total_profit
        });

        setRebalance(rebalanceRes.data.rebalance_recommendations || []);
        setInsights(insightsRes.data.insights || []);
        setCashflow(cashflowRes.data || null);

        if (trendRes.data && trendRes.data.trend) {
          const t = trendRes.data.trend.map((d) => ({ day: d.date, revenue: d.revenue }));
          setProfitData((prev) => ({ ...prev, trend: t }));
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const KPICard = ({ title, value, icon: Icon, trend, color = "from-purple-600 to-blue-600" }) => (
    <div className="group kpi-card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-400 mb-2">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className={`text-3xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
              {value}
            </p>
            {trend && <span className="text-xs text-green-400 font-semibold">+{trend}%</span>}
          </div>
        </div>
        <div className={`p-3 rounded-lg bg-gradient-to-br ${color} opacity-10 group-hover:opacity-20 transition-opacity`}>
          <Icon className="w-6 h-6 text-blue-400" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-4xl font-bold text-white mb-3">Dashboard</h1>
          <p className="text-slate-400 text-lg">Welcome to your AI Inventory insights</p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {!loading && profitData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
          <KPICard
            title="Predicted Revenue"
            value={`₹${(profitData.total_predicted_revenue || 0).toLocaleString()}`}
            icon={TrendingUp}
            trend={12}
            color="from-emerald-500 to-teal-500"
          />
          <KPICard
            title="Predicted Profit"
            value={`₹${(profitData.total_predicted_profit || 0).toLocaleString()}`}
            icon={Activity}
            trend={8}
            color="from-blue-500 to-cyan-500"
          />
          <KPICard
            title="Total Inventory"
            value={profitData.total_stock ?? '—'}
            icon={Zap}
            color="from-amber-500 to-orange-500"
          />
          <KPICard
            title="Inventory Health"
            value={`${Math.max(0, 100 - deadCount * 10)}%`}
            icon={AlertTriangle}
            color="from-pink-500 to-rose-500"
          />
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-4">
        {/* Revenue Trend */}
        {!loading && profitData && (
          <div className="chart-container p-6 lg:p-8">
            <div className="mb-8">
              <h2 className="text-xl font-bold text-white">Revenue Trend</h2>
              <p className="text-sm text-slate-400">7-day forecast</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#e2e8f0'
                  }}
                  formatter={(value) => `₹${value.toFixed(2)}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#a855f7"
                  strokeWidth={3}
                  dot={{ fill: '#a855f7', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Inventory Health */}
        {!loading && cashflow && (
          <div className="chart-container p-6 lg:p-8">
            <div className="mb-8">
              <h2 className="text-xl font-bold text-white">Inventory Health</h2>
              <p className="text-sm text-slate-400">Active vs Dead Stock</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  <Cell fill="#22c55e" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#e2e8f0'
                  }}
                  formatter={(value) => `${value}%`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Rebalance & Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Rebalance Alerts */}
        <div className="chart-container p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-8">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-xl font-bold text-white">Rebalance Alerts</h2>
              <p className="text-sm text-slate-400">Inventory optimization</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-slate-800 rounded-lg skeleton" />
              ))}
            </div>
          ) : rebalance.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-slate-400">No rebalancing needed</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rebalance.slice(0, 5).map((item, index) => (
                <div
                  key={index}
                  className="p-5 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-purple-500/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white">{item.product}</p>
                      <p className="text-sm text-slate-400">{item.action}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Insights */}
        <div className="chart-container p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-8">
            <Zap className="w-5 h-5 text-yellow-400" />
            <div>
              <h2 className="text-xl font-bold text-white">AI Insights</h2>
              <p className="text-sm text-slate-400">Smart recommendations</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-slate-800 rounded-lg skeleton" />
              ))}
            </div>
          ) : insights.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-slate-400">No insights yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {insights.slice(0, 5).map((text, index) => (
                <div
                  key={index}
                  className="p-5 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg hover:border-purple-500 transition-colors"
                >
                  <div className="flex gap-4">
                    <Zap className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-200 leading-relaxed">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// import { useEffect, useState } from "react";
// import API from "../api/api";
// import {
//   LineChart,
//   Line,
//   PieChart,
//   Pie,
//   Cell,
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   Tooltip,
//   ResponsiveContainer,
//   Legend
// } from "recharts";
// export default function Dashboard() {
//   const [profitData, setProfitData] = useState(null);
//   const [rebalance, setRebalance] = useState([]);
//   const [cashflow, setCashflow] = useState(null);
//   const [insights, setInsights] = useState([]);
//   const chartData = profitData
//     ? [
//       {
//         name: "Next 7 Days",
//         Revenue: profitData.total_predicted_revenue,
//         Profit: profitData.total_predicted_profit,
//       },
//     ]
//     : [];
//   const trendData = profitData
//     ? [
//       { day: "Mon", revenue: profitData.total_predicted_revenue * 0.12 },
//       { day: "Tue", revenue: profitData.total_predicted_revenue * 0.15 },
//       { day: "Wed", revenue: profitData.total_predicted_revenue * 0.18 },
//       { day: "Thu", revenue: profitData.total_predicted_revenue * 0.14 },
//       { day: "Fri", revenue: profitData.total_predicted_revenue * 0.16 },
//       { day: "Sat", revenue: profitData.total_predicted_revenue * 0.13 },
//       { day: "Sun", revenue: profitData.total_predicted_revenue * 0.12 }
//     ]
//     : [];
//   const pieData = cashflow
//     ? [
//       { name: "Active Stock", value: 100 - cashflow.dead_stock_products.length * 10 },
//       { name: "Dead Stock", value: cashflow.dead_stock_products.length * 10 }
//     ]
//     : [];

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const profitRes = await API.get("/analytics/profit-forecast");
//         const rebalanceRes = await API.get("/analytics/rebalance");
//         const insightsRes = await API.get("/analytics/insights");
//         const cashflowRes = await API.get("/analytics/cashflow");

//         setProfitData(profitRes.data);

//         // IMPORTANT FIX HERE 👇
//         setRebalance(
//           rebalanceRes.data.rebalance_recommendations || []
//         );

//         setInsights(
//           insightsRes.data.ai_insights || []
//         );

//         setCashflow(cashflowRes.data);

//       } catch (error) {
//         console.error("Error fetching dashboard data:", error);
//       }
//     };

//     fetchData();
//   }, []);

//   return (
//     <div className="p-8 bg-gray-100 min-h-screen">
//       <h1 className="text-3xl font-bold mb-6">
//         AI Inventory Dashboard 🚀
//       </h1>

//       {/* Profit Section */}
//       {profitData && (
//         <div className="grid grid-cols-2 gap-6 mb-8">
//           <div className="bg-white p-6 rounded-xl shadow">
//             <h2 className="text-gray-500">
//               Predicted Revenue (7 Days)
//             </h2>
//             <p className="text-2xl font-bold text-green-600">
//               ₹ {profitData.total_predicted_revenue}
//             </p>
//           </div>

//           <div className="bg-white p-6 rounded-xl shadow">
//             <h2 className="text-gray-500">
//               Predicted Profit (7 Days)
//             </h2>
//             <p className="text-2xl font-bold text-blue-600">
//               ₹ {profitData.total_predicted_profit}
//             </p>
//           </div>
//         </div>
//       )}

//       {profitData && (
//         <div className="bg-white p-6 rounded-2xl shadow-lg mb-8">
//           <h2 className="text-xl font-bold mb-4">
//             Revenue Trend (7 Days)
//           </h2>

//           <ResponsiveContainer width="100%" height={300}>
//             <LineChart data={trendData}>
//               <XAxis dataKey="day" />
//               <YAxis />
//               <Tooltip />
//               <Legend />
//               <Line
//                 type="monotone"
//                 dataKey="revenue"
//                 stroke="#3b82f6"
//                 strokeWidth={3}
//               />
//             </LineChart>
//           </ResponsiveContainer>
//         </div>
//       )}

//       {cashflow && (
//         <div className="bg-white p-6 rounded-2xl shadow-lg mb-8">
//           <h2 className="text-xl font-bold mb-4">
//             Inventory Health
//           </h2>

//           <ResponsiveContainer width="100%" height={300}>
//             <PieChart>
//               <Pie
//                 data={pieData}
//                 dataKey="value"
//                 outerRadius={100}
//                 fill="#8884d8"
//                 label
//               >
//                 <Cell fill="#22c55e" />
//                 <Cell fill="#ef4444" />
//               </Pie>
//               <Tooltip />
//             </PieChart>
//           </ResponsiveContainer>
//         </div>
//       )}

//       {/* Rebalance Section */}
//       <div className="bg-white p-6 rounded-xl shadow mb-8">
//         <h2 className="text-xl font-semibold mb-4">
//           Rebalance Alerts
//         </h2>

//         {rebalance.length === 0 ? (
//           <p className="text-gray-500">No alerts</p>
//         ) : (
//           rebalance.map((item, index) => (
//             <div key={index} className="mb-2">
//               ⚠️ {item.product} → {item.action}
//             </div>
//           ))
//         )}
//       </div>


//       {/* Insights Section */}
//       <div className="bg-white p-6 rounded-xl shadow">
//         <h2 className="text-xl font-semibold mb-4">
//           AI Insights
//         </h2>

//         {insights.length === 0 ? (
//           <p className="text-gray-500">No insights yet</p>
//         ) : (
//           insights.map((text, index) => (
//             <div key={index} className="mb-2">
//               💡 {text}
//             </div>
//           ))
//         )}


//       </div>
//     </div>
//   );
// }