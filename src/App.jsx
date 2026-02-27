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
  const [isLoading, setIsLoading] = useState(true);
  const [filterAsset, setFilterAsset] = useState("All");
  const [filterStrategy, setFilterStrategy] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showAllTime, setShowAllTime] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isStrategyOpen, setIsStrategyOpen] = useState(true);


  // const baseurl = "http://localhost:5001";
  const baseurl = "https://trademangerbk.onrender.com";
  const [uniqueStrategies, setUniqueStrategies] = useState([]);
  const [uniqueAssets,uniqueAssetsset] = useState([])

   useEffect(() => {
  const fetchAssets = async () => {
    try {
      const res = await axios.get(`${baseurl}/api/ListtAssets`, {
        params: { strategy: filterStrategy } // Pass the selected strategy to the backend
      });
      
      // Since .distinct returns an array of strings ["GOLD", "NIFTY"], 
      // we just set it directly
      uniqueAssetsset(res.data || []);
      
    } catch (error) {
      console.error("Error fetching assets", error);
    }
  };
  
  fetchAssets();
}, [filterStrategy, baseurl]); // This triggers whenever the strategy changes

  // FETCH STRATEGY NAMES
  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        const res = await axios.get(`${baseurl}/api/ListStrategyx`);
        // Sets the array of objects: [{_id, name, ...}]
        setUniqueStrategies(res.data);
        console.log(res);
        
      } catch (error) {
        console.error("Error fetching strategies", error);
      }
    };
    fetchStrategies();
  }, []);

  const assetConfigs = {
    GOLD: 100,
    SILVER: 5000,
    CRUDEOIL: 100,
    NIFTY: 65,
    BANKNIFTY: 30,
    BTCUSD: 1,
  };

  const getCurrency = (assetName) => {
    const indianAssets = ["NIFTY", "BANKNIFTY", "FINNIFTY", "CRUDEOIL", "GOLD", "SILVER", "NATURAL GAS","NATURAL GAS MINI"];
    if (assetName === "All" || !assetName) return "₹";
    return indianAssets.includes(assetName.toUpperCase()) ? "₹" : "$";
  };

  const [strategyNote, setStrategyNote] = useState("Select a strategy to view analysis notes.");

  useEffect(() => {
    const fetchNote = async () => {
      try {
        const res = await axios.get(`${baseurl}/api/notes`, {
          params: { asset: filterAsset, strategy: filterStrategy },
        });
        if (res.data && res.data.note) {
          setStrategyNote(res.data.note);
        } else {
          setStrategyNote(`No specific notes found for ${filterStrategy} on ${filterAsset}.`);
        }
      } catch (err) {
        setStrategyNote("Analysis period active. Data being updated via webhook.");
      }
    };
    fetchNote();
  }, [filterAsset, filterStrategy]);

  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
    setStartDate(firstDay);
    setEndDate(lastDay);
  }, []);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        setIsLoading(true);
        const res = await axios.get(`${baseurl}/api/trades`, {
          params: {
            asset: filterAsset,
            strategy: filterStrategy,
            status: filterStatus,
            startDate,
            endDate,
          },
        });
        setTrades(res.data.trades || []);
      } catch (err) {
        console.error("Error fetching trades", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTrades();
  }, [ filterAsset, filterStrategy, filterStatus, startDate, endDate, baseurl]);

  const calculateFinalPnL = (trade) => {
    const lotSize = assetConfigs[trade.asset?.toUpperCase()] || 1;
    return (trade.profitPoints || 0) * lotSize;
  };

  const filteredTrades = trades.filter((t) => {
    const matchAsset = filterAsset === "All" || t.asset === filterAsset;
    const matchStrategy = filterStrategy === "All" || t.strategyName === filterStrategy;
    const matchStatus = filterStatus === "All" || t.status === filterStatus;
    if (showAllTime) return matchAsset && matchStrategy && matchStatus;
    const tradeTime = new Date(t.entryTime || t.timestamp).getTime();
    const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
    const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;
    return matchAsset && matchStrategy && matchStatus && (!start || tradeTime >= start) && (!end || tradeTime <= end);
  });

  const calculateMaxDailyLoss = () => {
    if (filteredTrades.length === 0) return 0;
    const dailyPnL = {};
    filteredTrades.forEach((trade) => {
      const date = new Date(trade.entryTime || trade.timestamp).toLocaleDateString();
      const pnl = calculateFinalPnL(trade);
      dailyPnL[date] = (dailyPnL[date] || 0) + pnl;
    });
    const losses = Object.values(dailyPnL).filter((pnl) => pnl < 0);
    return losses.length > 0 ? Math.min(...losses) : 0;
  };

  const calculateMaxDrawdown = () => {
    if (filteredTrades.length === 0) return 0;
    const sortedTrades = [...filteredTrades].sort((a, b) => new Date(a.entryTime || a.timestamp) - new Date(b.entryTime || b.timestamp));
    let peak = 0, currentEquity = 0, maxDD = 0;
    sortedTrades.forEach((trade) => {
      currentEquity += calculateFinalPnL(trade);
      if (currentEquity > peak) peak = currentEquity;
      const drawdown = peak - currentEquity;
      if (drawdown > maxDD) maxDD = drawdown;
    });
    return maxDD;
  };

  const totalPnL = filteredTrades.reduce((acc, curr) => acc + calculateFinalPnL(curr), 0);
  const maxDrawdown = calculateMaxDrawdown();
  const maxDailyLoss = calculateMaxDailyLoss();
  const activeCurrency = getCurrency(filterAsset);
  const winRate = filteredTrades.length > 0 ? (filteredTrades.filter((t) => t.profitPoints > 0).length / filteredTrades.length) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-screen bg-[#0f172a] text-slate-200">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-24 h-24 border-4 border-emerald-500/20 rounded-full animate-ping"></div>
          <div className="w-16 h-16 border-4 border-t-emerald-500 border-r-transparent border-b-emerald-500/10 border-l-transparent rounded-full animate-spin"></div>
          <div className="absolute bg-emerald-500 p-2 rounded-lg"><Activity size={24} className="text-white" /></div>
        </div>
        <h2 className="mt-8 text-xl font-bold tracking-tighter text-white animate-pulse">Syncing PineConnect</h2>
        <p className="mt-2 text-slate-500 text-[10px] uppercase tracking-[0.3em] font-black">Waking up Render backend...</p>
      </div>
    );
  }

  return (
    <div className="flex w-full min-h-screen lg:h-screen bg-[#0f172a] text-slate-200 font-sans relative overflow-x-hidden">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1e293b] border-r border-slate-700 flex flex-col transform transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500 p-1.5 rounded-lg"><Activity size={20} className="text-white" /></div>
            <span className="text-xl font-bold text-white tracking-tight">PineConnect</span>
          </div>
          <button className="lg:hidden text-slate-400" onClick={() => setIsSidebarOpen(false)}><X size={20} /></button>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="flex items-center gap-3 p-3 bg-emerald-500/10 text-emerald-400 rounded-xl cursor-pointer font-bold">
            <LayoutDashboard size={18} /><span>Dashboard</span>
          </div>
          <div>
            <button onClick={() => setIsStrategyOpen(!isStrategyOpen)} className="w-full flex items-center justify-between p-3 hover:bg-slate-700/50 rounded-xl transition-all">
              <div className="flex items-center gap-3"><Target size={18} /><span className="font-medium">Strategies</span></div>
              <ChevronDown size={16} className={`transform transition-transform ${isStrategyOpen ? "rotate-180" : ""}`} />
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
                    key={s._id}
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
      <main className="flex-1 flex flex-col min-w-0 p-4 lg:p-8 lg:overflow-hidden relative">
        <header className="flex justify-between items-center mb-6 flex-shrink-0">
          <button className="lg:hidden p-2 bg-slate-800 rounded-lg mr-4" onClick={() => setIsSidebarOpen(true)}><Menu size={24} /></button>
          <div className="flex-1">
            <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight">Strategy Performance</h2>
            <p className="text-slate-400 text-xs lg:text-sm italic">Real-time Execution Journal</p>
          </div>
        </header>

        {/* FILTERS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-[#1e293b]/50 p-4 rounded-2xl border border-slate-700 backdrop-blur-md flex-shrink-0">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Asset</label>
            <select className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none" value={filterAsset} onChange={(e) => setFilterAsset(e.target.value)}>
              <option value="All">All Assets</option>
              {uniqueAssets.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Trade Status</label>
            <select className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="All">All Signals</option>
              <option value="open">Open (Entries)</option>
              <option value="closed">Closed (Exits)</option>
            </select>
          </div>
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Date Range Window</label>
            <div className="flex items-center gap-2">
              <input type="date" disabled={showAllTime} value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ colorScheme: "dark" }} className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer" />
              <span className="text-slate-600 font-bold text-xs">to</span>
              <input type="date" disabled={showAllTime} value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ colorScheme: "dark" }} className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer" />
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6 flex-shrink-0">
          <StatCard title="Net Profit" value={`${activeCurrency}${totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} icon={<TrendingUp className="text-emerald-400" />} />
          <StatCard title="Win Rate" value={`${winRate.toFixed(1)}%`} icon={<Target className="text-blue-400" />} />
          <StatCard title="Signals" value={filteredTrades.length} icon={<Activity className="text-purple-400" />} />
          <StatCard title="Max Drawdown" value={`${activeCurrency}${maxDrawdown.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} icon={<TrendingDown className="text-rose-400" />} />
          <StatCard title="Max Daily Loss" value={`${activeCurrency}${Math.abs(maxDailyLoss).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} icon={<Zap className="text-orange-400" />} trend="Risk" />
        </div>

        {/* STRATEGY NOTE SECTION */}
        <div className="mb-6 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex-shrink-0 transition-all">
          <div className="flex items-center gap-2 mb-1">
            <Info size={14} className="text-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">STRATEGY NOTE</span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed italic">{strategyNote}</p>
        </div>

        {/* DATA TABLE AREA */}
        <div className="lg:flex-1 lg:min-h-0 bg-[#1e293b] rounded-2xl border border-slate-700 flex flex-col shadow-2xl overflow-hidden mb-10 lg:mb-0">
          <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-800/20 flex-shrink-0">
            <h3 className="font-black text-white text-[10px] tracking-[0.2em] uppercase">Market Execution Log</h3>
            <div className="flex gap-2">
              <button onClick={() => setShowAllTime(!showAllTime)} className={`flex items-center gap-2 text-[10px] px-4 py-1.5 rounded-lg uppercase font-black transition-all border ${showAllTime ? "bg-emerald-500 text-white border-emerald-400" : "bg-slate-800 text-slate-400 border-slate-700"}`}><Eye size={12} /> {showAllTime ? "All Time" : "History"}</button>
            </div>
          </div>

          <div className="overflow-x-auto lg:overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1050px]">
              <thead className="bg-slate-800/95 lg:sticky lg:top-0 z-10 text-slate-500 text-[9px] uppercase tracking-[0.2em] font-black">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Asset</th>
                  <th className="px-6 py-4">Signal</th>
                  <th className="px-6 py-4 text-emerald-400">Entry</th>
                  <th className="px-6 py-4 text-rose-400">Exit</th>
                  <th className="px-6 py-4">Lot Size</th>
                  <th className="px-6 py-4 text-right">PnL ({activeCurrency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-sm">
                {filteredTrades.map((trade) => {
                  const dateObj = new Date(trade.entryTime || trade.timestamp);
                  const pnl = calculateFinalPnL(trade);
                  const currencySymbol = getCurrency(trade.asset);
                  return (
                    <tr key={trade._id} className="hover:bg-emerald-500/[0.03] transition-colors group">
                      <td className="px-6 py-4 text-slate-300 font-medium whitespace-nowrap">
                        {dateObj.toLocaleDateString([], { month: "short", day: "2-digit", year: "numeric" })}
                      </td>
                      <td className="px-6 py-4 font-black text-white uppercase tracking-tight">{trade.asset || "N/A"}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded text-[10px] font-black ${trade.type === "buy" || trade.type === "sell" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-700 text-slate-300"}`}>{(trade.type || trade.signal || "N/A").toUpperCase()}</span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-200">{currencySymbol}{trade.entryPrice?.toLocaleString() || "--"}</td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-200">{currencySymbol}{trade.exitPrice?.toLocaleString() || "--"}</td>
                      <td className="px-6 py-4 font-mono text-slate-400 text-xs">x{assetConfigs[trade.asset?.toUpperCase()] || 1}</td>
                      <td className={`px-6 py-4 text-right font-black ${pnl > 0 ? "text-emerald-400" : pnl < 0 ? "text-rose-400" : "text-slate-600"}`}>{currencySymbol}{pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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
  <div className="bg-[#1e293b] p-4 lg:p-6 rounded-2xl border border-slate-700 hover:border-slate-500 transition-all shadow-lg group">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2.5 bg-slate-900 rounded-xl group-hover:scale-110 transition-transform border border-slate-700">{icon}</div>
      {trend && <span className="text-[10px] text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-full font-black uppercase tracking-tighter">{trend}</span>}
    </div>
    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.15em]">{title}</p>
    <h4 className="text-xl lg:text-3xl font-bold text-white mt-1 tracking-tight">{value}</h4>
  </div>
);

export default Dashboard;