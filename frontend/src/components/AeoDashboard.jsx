import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Layers, Download, Copy, Code, Zap, Edit2, Plus, X, Loader2 } from 'lucide-react';

export default function AeoDashboard({ initialKeywords = [] }) {
    const [keywordsInput, setKeywordsInput] = useState(initialKeywords.join(', '));
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);
    
    // Sync initialKeywords to input if it changes
    useEffect(() => {
        if (initialKeywords.length > 0) {
            setKeywordsInput(initialKeywords.join(', '));
        }
    }, [initialKeywords]);

    const handleGenerate = async () => {
        const keywordsList = keywordsInput.split(',').map(k => k.trim()).filter(k => k);
        if (keywordsList.length === 0) return alert("Please enter at least one keyword.");
        
        setLoading(true);
        try {
            const resp = await axios.post('/api/aeo-generate', { keywords: keywordsList });
            if (resp.data.error) {
                alert(resp.data.error);
            } else {
                setResults(resp.data.results);
            }
        } catch (err) {
            console.error(err);
            alert("Error generating AEO report");
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerChange = (resultIdx, qIdx, newAnswer) => {
        const newResults = [...results];
        newResults[resultIdx].questions[qIdx].answer = newAnswer;
        setResults(newResults);
    };

    const handleEntityChange = (resultIdx, category, eIdx, newValue) => {
        const newResults = [...results];
        newResults[resultIdx].entities[category][eIdx] = newValue;
        setResults(newResults);
    };

    const handleAddEntity = (resultIdx, category) => {
        const newResults = [...results];
        newResults[resultIdx].entities[category].push("New Entity");
        setResults(newResults);
    };

    const handleRemoveEntity = (resultIdx, category, eIdx) => {
        const newResults = [...results];
        newResults[resultIdx].entities[category].splice(eIdx, 1);
        setResults(newResults);
    };

    const downloadMarkdown = (result) => {
        let md = `# AEO Report: ${result.keyword}\n\n`;
        md += `**AEO Opportunity Score**: ${result.opportunity_score}/100\n\n`;
        md += `## Golden Questions & Intent\n`;
        result.questions.forEach((q, i) => {
            md += `### ${i+1}. ${q.question} (${q.intent} Intent)\n${q.answer}\n\n`;
        });
        md += `## Advanced Entity Mapping\n`;
        ['primary_entities', 'secondary_entities', 'tertiary_entities', 'same_as_links'].forEach(cat => {
            md += `**${cat.replace('_', ' ').toUpperCase()}**:\n`;
            result.entities[cat].forEach(e => md += `- ${e}\n`);
            md += `\n`;
        });
        
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aeo-${result.keyword.replace(/\s+/g, '-').toLowerCase()}.md`;
        a.click();
    };

    const copyJsonLd = (result) => {
        const jsonLd = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": result.questions.map(q => ({
                "@type": "Question",
                "name": q.question,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": q.answer
                }
            })),
            "about": result.entities.primary_entities.map(e => ({ "@type": "Thing", "name": e })),
            "sameAs": result.entities.same_as_links
        };
        const blob = new Blob([JSON.stringify(jsonLd, null, 2)], { type: 'application/ld+json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `schema-${result.keyword.replace(/\s+/g, '-').toLowerCase()}.json`;
        a.click();
    };

    const copySeoMetaBlock = (result) => {
        const meta = `<!-- SEO Meta Block for ${result.keyword} -->\n<title>${result.keyword} | Professional Staffing Overview</title>\n<meta name="description" content="Expert insights on ${result.keyword}. Read our comprehensive FAQ answering the top questions about ${result.entities.primary_entities.join(', ')}." />\n<meta property="og:title" content="${result.keyword} Guide" />\n<meta property="og:description" content="Discover everything you need to know about ${result.keyword}." />`;
        const blob = new Blob([meta], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meta-${result.keyword.replace(/\s+/g, '-').toLowerCase()}.html`;
        a.click();
    };

    return (
        <div className="flex-1 bg-slate-950 text-slate-100 p-8 overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header & Controls */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
                    <div className="flex items-start justify-between gap-6">
                        <div className="flex-1 space-y-2">
                            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                                <Zap className="w-5 h-5 text-blue-500" />
                                AEO Research Generation
                            </h2>
                            <p className="text-sm text-slate-400">Generate "AI Overview" compliant structures for your target keywords.</p>
                            <div className="pt-4">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Seed Keywords (comma separated)</label>
                                <input 
                                    type="text" 
                                    value={keywordsInput}
                                    onChange={(e) => setKeywordsInput(e.target.value)}
                                    placeholder="e.g. Finance Staffing, Marketing Recruitment"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div className="pt-12">
                            <button 
                                onClick={handleGenerate}
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors shadow-lg shadow-blue-900/20 whitespace-nowrap flex items-center gap-2"
                            >
                                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : 'Generate AEO Report'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results List */}
                {results.length > 0 && (
                    <div className="space-y-8">
                        {results.map((res, rIdx) => (
                            <div key={rIdx} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                                {/* Result Header */}
                                <div className="bg-slate-800/50 border-b border-slate-700 p-6 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-2xl font-bold text-white mb-2">{res.keyword}</h3>
                                        <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-sm font-semibold border border-blue-500/20">
                                            AEO Opportunity Score: {res.opportunity_score} / 100
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => downloadMarkdown(res)} className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-600 hover:bg-slate-700 text-xs font-medium transition-colors">
                                            <Download className="w-4 h-4" /> Markdown
                                        </button>
                                        <button onClick={() => copyJsonLd(res)} className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-600 hover:bg-slate-700 text-xs font-medium transition-colors">
                                            <Download className="w-4 h-4" /> JSON-LD
                                        </button>
                                        <button onClick={() => copySeoMetaBlock(res)} className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-600 hover:bg-slate-700 text-xs font-medium transition-colors">
                                            <Download className="w-4 h-4" /> SEO Meta
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* Questions Column */}
                                    <div className="lg:col-span-2 space-y-6">
                                        <h4 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">Golden Questions & Intent</h4>
                                        {res.questions.map((q, qIdx) => (
                                            <div key={qIdx} className="bg-slate-950 p-4 rounded-lg border border-slate-800/60 relative group">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h5 className="font-semibold text-blue-400 flex items-center gap-2">
                                                        <Layers className="w-4 h-4" />
                                                        {q.question}
                                                    </h5>
                                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                                        {q.intent}
                                                    </span>
                                                </div>
                                                <div className="relative mt-3">
                                                    <Edit2 className="w-3 h-3 text-slate-500 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <textarea 
                                                        value={q.answer}
                                                        onChange={(e) => handleAnswerChange(rIdx, qIdx, e.target.value)}
                                                        className="w-full bg-slate-900 border border-slate-800 rounded-md p-3 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y min-h-[90px]"
                                                    />
                                                </div>
                                                <p className="text-[10px] text-slate-500 mt-2 text-right">Target ~50 words. Optimized for speakable markup.</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Entities Column */}
                                    <div className="space-y-6">
                                        <h4 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">Advanced Entity Mapping</h4>
                                        
                                        <details className="bg-emerald-950/30 border border-emerald-900/50 rounded-lg group">
                                            <summary className="cursor-pointer p-3 flex items-center gap-2 text-sm font-semibold text-emerald-400 select-none hover:bg-emerald-900/20 transition-colors">
                                                <div className="w-5 h-5 rounded bg-emerald-900/80 flex items-center justify-center text-emerald-400 group-open:rotate-90 transition-transform">
                                                    ›
                                                </div>
                                                How AI Crawlers read these Entities
                                            </summary>
                                            <div className="px-4 pb-4 pt-1 text-xs text-emerald-100/70 space-y-3 leading-relaxed border-t border-emerald-900/30 mt-1">
                                                <p>
                                                    To understand these sections, view them through the eyes of an <strong>AI Crawler (like Gemini or GPT-4)</strong>. They represent the <em>"Semantic Signature"</em> of your page:
                                                </p>
                                                <div className="space-y-2">
                                                    <p><strong className="text-emerald-300">Primary (The Core):</strong> Non-negotiable topics. Without these, the AI won't know where to categorize your page.</p>
                                                    <p><strong className="text-emerald-300">Secondary (The Context):</strong> Provide depth, proving this is a professional service, not just a casual post.</p>
                                                    <p><strong className="text-emerald-300">Tertiary (The Nuance):</strong> "Edge" topics that prove your content is comprehensive and authoritative (E-E-A-T).</p>
                                                </div>
                                                <p>
                                                    When you download <strong>JSON-LD</strong>, these tags bundle into a machine-readable script telling Google: <em>"This page is explicitly about [Primary] and related to [Secondary]."</em>
                                                </p>
                                                <div className="bg-emerald-900/20 p-3 rounded-md border border-emerald-800/30 mt-2 relative overflow-hidden">
                                                    <Zap className="absolute -right-2 -bottom-2 w-12 h-12 text-emerald-500/10" />
                                                    <strong className="text-emerald-300 block mb-1">Same As Links (Knowledge Graph Bridge)</strong>
                                                    <p>
                                                        Points the AI to a "Universal Truth" (e.g., Wikipedia). This removes ambiguity and makes it much easier for a Frontier Model to cite you as a factual source.
                                                    </p>
                                                </div>
                                            </div>
                                        </details>
                                        
                                        {['primary_entities', 'secondary_entities', 'tertiary_entities', 'same_as_links'].map(category => (
                                            <div key={category} className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h6 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                        {category.replace('_', ' ')}
                                                    </h6>
                                                    <button onClick={() => handleAddEntity(rIdx, category)} className="text-blue-500 hover:text-blue-400 p-1">
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                <div className="space-y-2">
                                                    {res.entities[category]?.map((entity, eIdx) => (
                                                        <div key={eIdx} className="flex relative items-center gap-2">
                                                            <input 
                                                                type="text" 
                                                                value={entity}
                                                                onChange={(e) => handleEntityChange(rIdx, category, eIdx, e.target.value)}
                                                                className="flex-1 bg-slate-950 border border-slate-800 rounded py-1.5 px-3 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            />
                                                            <button onClick={() => handleRemoveEntity(rIdx, category, eIdx)} className="text-slate-600 hover:text-red-400 p-1">
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
