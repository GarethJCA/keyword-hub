import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Search,
    MapPin,
    Layers,
    Download,
    FileText,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    BarChart3,
    Zap,
    Loader2
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import ChatPanel from './components/ChatPanel';
import QuickSearch from './components/QuickSearch';
import AeoDashboard from './components/AeoDashboard';

const Sparkline = ({ data }) => (
    <div className="h-12 w-24">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
                <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                />
            </LineChart>
        </ResponsiveContainer>
    </div>
);

export default function App() {
    const [seed, setSeed] = useState('Marketing Recruitment');
    const [region, setRegion] = useState('Canada');
    const [layer, setLayer] = useState('Layer 1');
    const [limit, setLimit] = useState(20);
    const [competition, setCompetition] = useState('ALL');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedKeywords, setSelectedKeywords] = useState([]);
    const [chatOpen, setChatOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('hub');

    const handleSearch = async () => {
        setLoading(true);
        try {
            const resp = await axios.post('/api/research', {
                seed_keyword: seed,
                target_region: region,
                layer: layer,
                limit: limit,
                competition: competition
            });
            setResults(resp.data.keywords);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = (text) => {
        setSelectedKeywords(prev =>
            prev.includes(text) ? prev.filter(k => k !== text) : [...prev, text]
        );
    };

    const exportCSV = () => {
        const headers = ['Keyword', 'Volume', 'Competition', 'CPC (CAD)', 'Priority', 'Flag'];
        const rows = results.map(r => [
            r.text,
            r.avg_monthly_volume,
            r.competition,
            r.cpc_cad,
            r.priority,
            r.strategic_flag
        ]);
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `keywords-${seed.replace(/\s+/g, '-').toLowerCase()}.csv`;
        a.click();
    };

    const handleDraftOutline = () => {
        if (selectedKeywords.length === 0) return alert("Select keywords first");
        setChatOpen(true);
    };

    return (
        <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-80 bg-slate-900 border-r border-slate-800 p-6 flex flex-col overflow-y-auto">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-lg">
                        <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">Keyword Hub</h1>
                </div>

                <div className="flex gap-1 bg-slate-950 p-1 rounded-lg mb-6 border border-slate-800">
                    <button onClick={() => setActiveTab('hub')} className={`flex-1 text-sm font-semibold py-1.5 rounded-md transition-colors ${activeTab === 'hub' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Keyword Hub</button>
                    <button onClick={() => setActiveTab('aeo')} className={`flex-1 text-sm font-semibold py-1.5 rounded-md transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'aeo' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}><Zap className="w-3.5 h-3.5" /> AEO Research</button>
                </div>

                {activeTab === 'hub' ? (
                    <>
                    <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Seed Keyword</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                value={seed}
                                onChange={(e) => setSeed(e.target.value)}
                                placeholder="e.g. Finance Staffing"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Region</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                value={region}
                                onChange={(e) => setRegion(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Layer</label>
                        <div className="relative">
                            <Layers className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                            <select
                                value={layer}
                                onChange={(e) => setLayer(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {[1, 2, 3, 4, 5].map(l => (
                                    <option key={l} value={`Layer ${l}`}>Layer {l} - {
                                        l === 1 ? 'Hub' : l === 2 ? 'Vertical' : l === 3 ? 'Geo' : l === 4 ? 'E-E-A-T' : 'Conversion'
                                    }</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Keywords Limit</label>
                        <div className="relative">
                            <Layers className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                            <select
                                value={limit}
                                onChange={(e) => setLimit(Number(e.target.value))}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={5}>5 Keywords</option>
                                <option value={10}>10 Keywords</option>
                                <option value={20}>20 Keywords</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Competition</label>
                        <div className="relative">
                            <Layers className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                            <select
                                value={competition}
                                onChange={(e) => setCompetition(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="ALL">All Levels</option>
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={handleSearch}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                    >
                        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : 'Generate Keyword Ideas'}
                    </button>
                </div>

                {/* Quick Search Mini-App */}
                <QuickSearch />
                </>
                ) : (
                    <div className="flex-1 flex items-center justify-center p-6 text-center text-slate-500 border border-dashed border-slate-700 rounded-lg">
                        <div className="space-y-2">
                            <Zap className="w-8 h-8 mx-auto opacity-20" />
                            <p className="text-sm font-bold text-slate-400">AEO Dashboard Active</p>
                            <p className="text-xs">Select Keyword Hub to resume traditional research.</p>
                        </div>
                    </div>
                )}

                <div className="pt-6 border-t border-slate-800 mt-4">
                    <p className="text-[10px] text-slate-500 leading-relaxed uppercase tracking-widest font-bold">
                        Powered by Google Ads API & Professional Staffing Brand Standards v2.0
                    </p>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-800 px-8 flex items-center justify-between bg-slate-950/50 backdrop-blur-sm z-10">
                    <div>
                        <span className="text-sm text-slate-400">Project /</span>
                        <span className="ml-1 text-sm font-medium text-slate-100">Keyword Research Dashboard</span>
                    </div>
                    {activeTab === 'hub' && (
                        <div className="flex gap-3">
                            <button
                                onClick={exportCSV}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-700 hover:bg-slate-800 text-xs font-medium transition-colors"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Export to CSV
                            </button>
                            <button
                                onClick={() => {
                                    if (selectedKeywords.length === 0) return alert("Select keywords first");
                                    setActiveTab('aeo');
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-transparent border border-blue-600/50 hover:bg-blue-600/10 text-blue-400 text-xs font-bold transition-colors"
                            >
                                <Zap className="w-3.5 h-3.5" />
                                Send to AEO
                            </button>
                            <button
                                onClick={handleDraftOutline}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white text-slate-950 hover:bg-slate-200 text-xs font-bold transition-colors"
                            >
                                <FileText className="w-3.5 h-3.5" />
                                Draft Page Outline
                            </button>
                        </div>
                    )}
                </header>

                {activeTab === 'hub' ? (
                <section className="flex-1 overflow-auto p-8">
                    {results.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500">
                            <TrendingUp className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-lg">Enter a seed keyword to begin research</p>
                            <p className="text-sm">Metrics will be pulled directly from the Google Ads API</p>
                        </div>
                    ) : (
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-900/80 border-b border-slate-800 font-semibold text-xs text-slate-400 uppercase tracking-wider">
                                        <th className="px-6 py-4 w-12"><input type="checkbox" className="rounded bg-slate-700 border-none" /></th>
                                        <th className="px-6 py-4">Keyword</th>
                                        <th className="px-6 py-4">Trends (12mo)</th>
                                        <th className="px-6 py-4">Vol/mo</th>
                                        <th className="px-6 py-4">Competition</th>
                                        <th className="px-6 py-4">CPC (CAD)</th>
                                        <th className="px-6 py-4">Priority</th>
                                        <th className="px-6 py-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {results.map((item, idx) => (
                                        <tr
                                            key={idx}
                                            className={`group hover:bg-slate-800/50 transition-colors ${selectedKeywords.includes(item.text) ? 'bg-blue-900/10' : ''}`}
                                        >
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedKeywords.includes(item.text)}
                                                    onChange={() => toggleSelect(item.text)}
                                                    className="rounded bg-slate-700 border-none cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-100">{item.text}</div>
                                                <div className="text-[10px] text-slate-500 mt-0.5">{region} Market</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Sparkline data={item.history} />
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-mono">{item.avg_monthly_volume.toLocaleString()}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.competition === 'HIGH' ? 'bg-red-500/10 text-red-500' :
                                                    item.competition === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-500' :
                                                        'bg-emerald-500/10 text-emerald-500'
                                                    }`}>
                                                    {item.competition}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-mono">${item.cpc_cad.toFixed(2)}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`flex items-center gap-1.5 text-xs font-bold ${item.priority === 'P1' ? 'text-blue-400' :
                                                    item.priority === 'P2' ? 'text-slate-300' :
                                                        'text-slate-500'
                                                    }`}>
                                                    {item.priority === 'P1' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                                    {item.priority === 'P3' && <AlertCircle className="w-3.5 h-3.5" />}
                                                    {item.priority}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[10px] text-slate-400 italic font-medium whitespace-nowrap">{item.strategic_flag}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
                ) : (
                    <AeoDashboard initialKeywords={selectedKeywords} />
                )}
            </main>

            {/* AI Chat Panel */}
            <ChatPanel
                isOpen={chatOpen}
                onClose={() => setChatOpen(false)}
                selectedKeywords={selectedKeywords}
                layer={layer}
            />
        </div>
    );
}
