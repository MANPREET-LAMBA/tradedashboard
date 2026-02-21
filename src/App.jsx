import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  LayoutDashboard,
  BarChart3,
  User,
  ChevronDown,
  TrendingUp,
  Activity,
  Target,
  Zap,
  Menu,
  X,
  Search,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Eye,
  TrendingDown,
} from "lucide-react";

const Dashboard = () => {
  const [trades, setTrades] = useState([]);
  const [filterAsset, setFilterAsset] = useState("XAUUSD");
  const [filterStrategy, setFilterStrategy] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showAllTime, setShowAllTime] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isStrategyOpen, setIsStrategyOpen] = useState(true);

  // LOT SIZE CONFIGURATION
  const assetConfigs = {
    GOLD: 100,
    SILVER: 5000,
    CRUDEOIL: 100,
    NIFTY: 75,
    BANKNIFTY: 15,
    BTCUSD: 1,
  };

  // --- NEW: CURRENCY HELPER ---
  const getCurrency = (assetName) => {
    const indianAssets = [
      "NIFTY",
      "BANKNIFTY",
      "FINNIFTY",
      "CRUDEOIL",
      "GOLD",
      "SILVER",
    ];
    if (assetName === "All" || !assetName) return "₹"; // Default to Indian if multiple/none
    return indianAssets.includes(assetName.toUpperCase()) ? "₹" : "$";
  };

  const [strategyNote, setStrategyNote] = useState(
    "Select a strategy to view analysis notes.",
  );

  useEffect(() => {
    const fetchNote = async () => {
      // Only fetch if a specific asset/strategy is selected, or handle 'All' as a general note
      try {
        const res = await axios.get(`http://localhost:5001/api/notes`, {
          params: {
            asset: filterAsset,
            strategy: filterStrategy,
          },
        });

        if (res.data && res.data.note) {
          setStrategyNote(res.data.note);
        } else {
          setStrategyNote(
            `No specific notes found for ${filterStrategy} on ${filterAsset}.`,
          );
        }
      } catch (err) {
        console.error("Error fetching note:", err);
        setStrategyNote(
          "Analysis period active. Data being updated via webhook.",
        );
      }
    };

    fetchNote();
  }, [filterAsset, filterStrategy]); // Re-run whenever filters change

  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];
    setStartDate(firstDay);
    setEndDate(lastDay);
  }, []);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await axios.get("http://localhost:5001/api/trades");
        setTrades(res.data);
      } catch (err) {
        console.error("Error fetching trades", err);
      }
    };
    fetchTrades();
  }, []);

  const filteredTrades = trades.filter((t) => {
    const matchAsset = filterAsset === "All" || t.asset === filterAsset;
    const matchStrategy =
      filterStrategy === "All" || t.strategyName === filterStrategy;
    const matchStatus = filterStatus === "All" || t.status === filterStatus;

    if (showAllTime) return matchAsset && matchStrategy && matchStatus;

    const tradeTime = new Date(t.entryTime || t.timestamp).getTime();
    const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
    const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;
    const matchDate =
      (!start || tradeTime >= start) && (!end || tradeTime <= end);

    return matchAsset && matchStrategy && matchStatus && matchDate;
  });

  const calculateFinalPnL = (trade) => {
    const lotSize = assetConfigs[trade.asset?.toUpperCase()] || 1;
    return (trade.profitPoints || 0) * lotSize;
  };

  // --- NEW: MAX EQUITY DRAWDOWN FUNCTION ---
  const calculateMaxDrawdown = () => {
    if (filteredTrades.length === 0) return 0;

    // Sort trades chronologically for equity curve
    const sortedTrades = [...filteredTrades].sort(
      (a, b) =>
        new Date(a.entryTime || a.timestamp) -
        new Date(b.entryTime || b.timestamp),
    );

    let peak = 0;
    let currentEquity = 0;
    let maxDD = 0;

    sortedTrades.forEach((trade) => {
      currentEquity += calculateFinalPnL(trade);
      if (currentEquity > peak) peak = currentEquity;

      const drawdown = peak - currentEquity;
      if (drawdown > maxDD) maxDD = drawdown;
    });

    return maxDD;
  };

  const totalPnL = filteredTrades.reduce(
    (acc, curr) => acc + calculateFinalPnL(curr),
    0,
  );
  const maxDrawdown = calculateMaxDrawdown();
  const activeCurrency = getCurrency(filterAsset);

  const winRate =
    filteredTrades.length > 0
      ? (filteredTrades.filter((t) => t.profitPoints > 0).length /
          filteredTrades.length) *
        100
      : 0;

  const uniqueStrategies = [
    ...new Set(trades.map((t) => t.strategyName).filter(Boolean)),
  ];
  const uniqueAssets = [...new Set(trades.map((t) => t.asset).filter(Boolean))];

  return (
    <div className="flex w-full h-screen bg-[#0f172a] text-slate-200 font-sans relative overflow-hidden">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#1e293b] border-r border-slate-700 flex flex-col transform transition-transform duration-300
        lg:relative lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <div className="p-6 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500 p-1.5 rounded-lg">
              <Activity size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              PineConnect
            </span>
          </div>
          <button
            className="lg:hidden text-slate-400"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="flex items-center gap-3 p-3 bg-emerald-500/10 text-emerald-400 rounded-xl cursor-pointer font-bold">
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </div>
          <div>
            <button
              onClick={() => setIsStrategyOpen(!isStrategyOpen)}
              className="w-full flex items-center justify-between p-3 hover:bg-slate-700/50 rounded-xl transition-all"
            >
              <div className="flex items-center gap-3">
                <Target size={18} />{" "}
                <span className="font-medium">Strategies</span>
              </div>
              <ChevronDown
                size={16}
                className={`transform transition-transform ${isStrategyOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isStrategyOpen && (
              <div className="mt-1 ml-4 border-l border-slate-700 pl-4 space-y-1">
                <button
                  onClick={() => setFilterStrategy("All")}
                  className={`w-full text-left p-2 text-sm rounded-lg ${filterStrategy === "All" ? "text-emerald-400 font-bold bg-emerald-500/5" : "text-slate-400 hover:text-white"}`}
                >
                  All Strategies
                </button>
                {uniqueStrategies.map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStrategy(s)}
                    className={`w-full text-left p-2 text-sm rounded-lg ${filterStrategy === s ? "text-emerald-400 font-bold bg-emerald-500/5" : "text-slate-400 hover:text-white"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 h-screen p-4 lg:p-8 overflow-hidden">
        <header className="flex justify-between items-center mb-6 flex-shrink-0">
          <button
            className="lg:hidden p-2 bg-slate-800 rounded-lg mr-4"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          <div className="hidden sm:block flex-1">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Strategy Performance
            </h2>
            <p className="text-slate-400 text-sm italic">
              Real-time Execution Journal
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex bg-slate-800/50 rounded-full px-4 py-1.5 items-center gap-2 border border-slate-700">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                Live Webhook Active
              </span>
            </div>
            <div className="w-10 h-10 bg-slate-800 rounded-full border border-slate-700 flex items-center justify-center text-emerald-400">
              <User size={20} />
            </div>
          </div>
        </header>

        {/* FILTERS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-[#1e293b]/50 p-4 rounded-2xl border border-slate-700 backdrop-blur-md flex-shrink-0">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">
              Asset
            </label>
            <select
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white"
              value={filterAsset}
              onChange={(e) => setFilterAsset(e.target.value)}
            >
              <option value="All">All Assets</option>
              {uniqueAssets.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">
              Trade Status
            </label>
            <select
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Signals</option>
              <option value="open">Open (Entries)</option>
              <option value="closed">Closed (Exits)</option>
            </select>
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">
              Date Range Window
            </label>
            <div className="flex items-center gap-2">
              {/* Added showPicker on Click and color-scheme dark to fix black icon */}
              <div
                className={`flex-1 flex items-center bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 cursor-pointer ${showAllTime ? "opacity-30 cursor-not-allowed" : ""}`}
                onClick={(e) =>
                  !showAllTime &&
                  e.currentTarget.querySelector("input").showPicker()
                }
              >
                <input
                  type="date"
                  disabled={showAllTime}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ colorScheme: "dark" }}
                  className="w-full bg-transparent text-xs text-white outline-none cursor-pointer"
                />
              </div>
              <span className="text-slate-600 font-bold text-xs">to</span>
              <div
                className={`flex-1 flex items-center bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 cursor-pointer ${showAllTime ? "opacity-30 cursor-not-allowed" : ""}`}
                onClick={(e) =>
                  !showAllTime &&
                  e.currentTarget.querySelector("input").showPicker()
                }
              >
                <input
                  type="date"
                  disabled={showAllTime}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ colorScheme: "dark" }}
                  className="w-full bg-transparent text-xs text-white outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* STATS - Currency Dynamic based on activeCurrency */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 flex-shrink-0">
          <StatCard
            title={`Net Profit (${showAllTime ? "Total" : "Month"})`}
            value={`${activeCurrency}${totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            icon={<TrendingUp className="text-emerald-400" />}
            trend="+12.5%"
          />
          <StatCard
            title="Win Rate"
            value={`${winRate.toFixed(1)}%`}
            icon={<Target className="text-blue-400" />}
          />
          <StatCard
            title="Signals Found"
            value={filteredTrades.length}
            icon={<Activity className="text-purple-400" />}
          />
          {/* Change 1: Max Equity Drawdown */}
          <StatCard
            title="Max Equity Drawdown"
            value={`${activeCurrency}${maxDrawdown.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            icon={<TrendingDown className="text-rose-400" />}
          />
        </div>

        {/* STRATEGY NOTE SECTION */}
        <div className="mb-6 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex-shrink-0 transition-all">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Info size={14} className="text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                STRATEGY NOTE
              </span>
            </div>
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
              {filterAsset} | {filterStrategy}
            </span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed italic">
            {strategyNote}
          </p>
        </div>

        {/* DATA TABLE AREA */}
        <div className="flex-1 min-h-0 bg-[#1e293b] rounded-2xl border border-slate-700 flex flex-col shadow-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-800/20 flex-shrink-0">
            <h3 className="font-black text-white text-[10px] tracking-[0.2em] uppercase">
              Market Execution Log
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAllTime(!showAllTime)}
                className={`flex items-center gap-2 text-[10px] px-4 py-1.5 rounded-lg uppercase font-black transition-all border ${
                  showAllTime
                    ? "bg-emerald-500 text-white border-emerald-400"
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                }`}
              >
                <Eye size={12} />
                {showAllTime ? "Viewing All Time" : "View All History"}
              </button>
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setFilterAsset("All");
                  setFilterStrategy("All");
                  setShowAllTime(false);
                }}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 px-4 py-1.5 rounded-lg text-slate-400 uppercase font-black transition-all border border-slate-700"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1050px]">
              <thead className="bg-slate-800/95 sticky top-0 z-10 text-slate-500 text-[9px] uppercase tracking-[0.2em] font-black">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Asset</th>
                  <th className="px-6 py-4">Signal</th>
                  <th className="px-6 py-4 text-emerald-400">Entry</th>
                  <th className="px-6 py-4 text-rose-400">Exit</th>
                  <th className="px-6 py-4">Lot Size</th>
                  <th className="px-6 py-4 text-right">
                    PnL ({activeCurrency})
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-sm">
                {filteredTrades.map((trade) => {
                  const dateObj = new Date(trade.entryTime || trade.timestamp);
                  const currentLotSize =
                    assetConfigs[trade.asset?.toUpperCase()] || 1;
                  const finalPnL = calculateFinalPnL(trade);
                  const currencySymbol = getCurrency(trade.asset);

                  return (
                    <tr
                      key={trade._id}
                      className="hover:bg-emerald-500/[0.03] transition-colors group"
                    >
                      <td className="px-6 py-4 text-slate-300 font-medium whitespace-nowrap">
                        {dateObj.toLocaleDateString([], {
                          month: "short",
                          day: "2-digit",
                          year: "numeric",
                        })}
                        <span className="block text-[10px] text-slate-500 mt-0.5">
                          {dateObj.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-black text-white uppercase tracking-tight">
                        {trade.asset || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded text-[10px] font-black ${
                            trade.type === "buy" || trade.type === "sell"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-slate-700 text-slate-300"
                          }`}
                        >
                          {(trade.type || trade.signal || "N/A").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-200">
                        {currencySymbol}
                        {trade.entryPrice?.toLocaleString() || "--"}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-200">
                        {currencySymbol}
                        {trade.exitPrice?.toLocaleString() || "--"}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-400 text-xs">
                        x{currentLotSize}
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-black ${finalPnL > 0 ? "text-emerald-400" : finalPnL < 0 ? "text-rose-400" : "text-slate-600"}`}
                      >
                        {currencySymbol}
                        {finalPnL.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

const StatCard = ({ title, value, icon, trend }) => (
  <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 hover:border-slate-500 transition-all shadow-lg group">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2.5 bg-slate-900 rounded-xl group-hover:scale-110 transition-transform border border-slate-700">
        {icon}
      </div>
      {trend && (
        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full font-black uppercase tracking-tighter">
          {trend}
        </span>
      )}
    </div>
    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.15em]">
      {title}
    </p>
    <h4 className="text-xl lg:text-3xl font-bold text-white mt-1 tracking-tight">
      {value}
    </h4>
  </div>
);

export default Dashboard;
