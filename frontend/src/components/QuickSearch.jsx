import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Calendar, Send, Bot, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const MONTHS = [
    { value: '', label: 'Any' },
    { value: 'January', label: 'Jan' },
    { value: 'February', label: 'Feb' },
    { value: 'March', label: 'Mar' },
    { value: 'April', label: 'Apr' },
    { value: 'May', label: 'May' },
    { value: 'June', label: 'Jun' },
    { value: 'July', label: 'Jul' },
    { value: 'August', label: 'Aug' },
    { value: 'September', label: 'Sep' },
    { value: 'October', label: 'Oct' },
    { value: 'November', label: 'Nov' },
    { value: 'December', label: 'Dec' },
];

const YEARS = [2024, 2025, 2026];

export default function QuickSearch() {
    const [question, setQuestion] = useState('');
    const [location, setLocation] = useState('Canada');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState(2026);
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const responseRef = useRef(null);

    useEffect(() => {
        responseRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [response, history]);

    const handleSearch = async () => {
        if (!question.trim() || loading) return;
        setLoading(true);
        setResponse('');

        const entry = { question, location, month, year, answer: '' };

        try {
            const resp = await fetch('/api/quick-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question,
                    location,
                    month: month || null,
                    year: month ? year : null
                })
            });

            // Check if response is JSON error
            const contentType = resp.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const errorData = await resp.json();
                entry.answer = `⚠️ ${errorData.error || 'An error occurred'}`;
                setHistory(prev => [entry, ...prev]);
                setLoading(false);
                return;
            }

            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                fullText += decoder.decode(value, { stream: true });
                setResponse(fullText);
            }

            entry.answer = fullText;
            setHistory(prev => [entry, ...prev]);
            setQuestion('');
        } catch (err) {
            console.error('Quick Search error:', err);
            entry.answer = '⚠️ Connection error. Please try again.';
            setHistory(prev => [entry, ...prev]);
        } finally {
            setLoading(false);
            setResponse('');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
        }
    };

    return (
        <div className="border-t border-slate-700/50 pt-5 mt-5">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <div className="bg-emerald-600 p-1.5 rounded-md">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Quick Search</h3>
                    <p className="text-[9px] text-slate-500">Natural language keyword insights</p>
                </div>
            </div>

            {/* Question Input */}
            <div className="space-y-2.5">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder='e.g. "Most searched tax job title?"'
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-600"
                    />
                </div>

                {/* Filters Row */}
                <div className="flex gap-1.5">
                    <div className="flex-1 relative">
                        <MapPin className="absolute left-2 top-2 w-3 h-3 text-slate-500" />
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="City / Country"
                            className="w-full bg-slate-800 border border-slate-700 rounded-md py-1.5 pl-7 pr-2 text-[10px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>
                    <select
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-md py-1.5 px-1.5 text-[10px] appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500 w-14"
                    >
                        {MONTHS.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                    <select
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="bg-slate-800 border border-slate-700 rounded-md py-1.5 px-1.5 text-[10px] appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500 w-14"
                    >
                        {YEARS.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>

                {/* Search Button */}
                <button
                    onClick={handleSearch}
                    disabled={loading || !question.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="flex gap-0.5">
                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            Searching...
                        </>
                    ) : (
                        <>
                            <Send className="w-3 h-3" /> Ask
                        </>
                    )}
                </button>
            </div>

            {/* Active Response */}
            {loading && response && (
                <div className="mt-3 bg-slate-800/50 border border-emerald-500/20 rounded-lg p-3">
                    <div className="prose prose-invert prose-xs max-w-none text-[11px] leading-relaxed prose-headings:text-emerald-300 prose-strong:text-emerald-200 prose-p:text-slate-300">
                        <ReactMarkdown>{response}</ReactMarkdown>
                    </div>
                </div>
            )}

            {/* History */}
            {history.length > 0 && (
                <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                    {history.map((entry, idx) => (
                        <div key={idx} className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-2.5">
                            <div className="flex items-start gap-1.5 mb-1.5">
                                <Bot className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                                <p className="text-[10px] text-slate-400 font-medium leading-tight">{entry.question}</p>
                            </div>
                            {entry.month && (
                                <div className="flex gap-1 mb-1.5 ml-4">
                                    <span className="text-[8px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full">{entry.month} {entry.year}</span>
                                    <span className="text-[8px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full">{entry.location}</span>
                                </div>
                            )}
                            <div className="ml-4 prose prose-invert prose-xs max-w-none text-[10px] leading-relaxed prose-headings:text-emerald-300 prose-strong:text-emerald-200 prose-p:text-slate-400">
                                <ReactMarkdown>{entry.answer}</ReactMarkdown>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div ref={responseRef} />
        </div>
    );
}
