import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Plus,
  ShoppingCart,
  Package,
  TrendingUp,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

import Dashboard from "./pages/Dashboard";
import AddProduct from "./pages/AddProduct";
import AddSale from "./pages/AddSale";
import ProductTable from "./pages/ProductTable";
import Simulation from "./pages/Simulation";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/add-product", label: "Add Product", icon: Plus },
    { path: "/add-sale", label: "Add Sale", icon: ShoppingCart },
    { path: "/products", label: "Products", icon: Package },
    { path: "/simulation", label: "Simulation", icon: TrendingUp },
  ];

  return (
    <Router>
      <div className="flex h-screen bg-slate-950">
        {/* ================= SIDEBAR ================= */}
        <div
          className={`${
            sidebarOpen ? "w-64" : "w-20"
          } bg-gradient-to-b from-slate-900 to-slate-950 text-white transition-all duration-300 border-r border-slate-800 flex flex-col`}
        >
          {/* Logo Section */}
          <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800">
            <div className={`flex items-center gap-3 ${!sidebarOpen && "justify-center w-full"}`}>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center font-bold text-white">
                IA
              </div>
              {sidebarOpen && <span className="font-bold text-lg">Inventra AI</span>}
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto">
            <div className="space-y-2 p-4">
              {navItems.map(({ path, label, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    `flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/50"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                    } ${!sidebarOpen && "justify-center"}`
                  }
                  title={!sidebarOpen ? label : ""}
                >
                  <Icon size={20} />
                  {sidebarOpen && <span>{label}</span>}
                </NavLink>
              ))}
            </div>
          </nav>

          {/* Settings */}
          <div className="border-t border-slate-800 p-4 space-y-2">
            <button
              className="flex items-center gap-4 w-full px-4 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all duration-200"
              title={!sidebarOpen ? "Settings" : ""}
            >
              <Settings size={20} />
              {sidebarOpen && <span>Settings</span>}
            </button>
            <button
              className="flex items-center gap-4 w-full px-4 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all duration-200"
              title={!sidebarOpen ? "Logout" : ""}
            >
              <LogOut size={20} />
              {sidebarOpen && <span>Logout</span>}
            </button>
          </div>
        </div>

        {/* ================= MAIN CONTENT ================= */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="bg-slate-900 border-b border-slate-800 px-8 py-4 flex items-center justify-between shadow-sm">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className="flex items-center gap-4">
              <div className="text-slate-300 text-base font-medium">Welcome back!</div>
            </div>
          </div>

          {/* Page Content */}
          <div className="flex-1 overflow-auto bg-slate-950">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/add-product" element={<AddProduct />} />
                <Route path="/add-sale" element={<AddSale />} />
                <Route path="/products" element={<ProductTable />} />
                <Route path="/simulation" element={<Simulation />} />
              </Routes>
            </div>
          </div>
        </div>
      </div>
    </Router>
  );
}