import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Sparkles, Key } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';

export default function ChatPanel({ isOpen, onClose, selectedKeywords, layer }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [streaming, setStreaming] = useState(false);
    const [hasApiKey, setHasApiKey] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [showKeyForm, setShowKeyForm] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            axios.get('/api/has-api-key').then(res => {
                setHasApiKey(res.data.has_key);
                if (!res.data.has_key) setShowKeyForm(true);
            });
        }
    }, [isOpen]);

    // Auto-send initial draft request when panel opens with keywords
    useEffect(() => {
        if (isOpen && hasApiKey && selectedKeywords.length > 0 && messages.length === 0) {
            const initialMsg = `Draft a complete page outline for ${layer} using these keywords:\n${selectedKeywords.map(k => `• ${k}`).join('\n')}`;
            sendMessage(initialMsg);
        }
    }, [isOpen, hasApiKey]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const saveApiKey = async () => {
        if (!apiKeyInput.trim()) return;
        await axios.post('/api/set-api-key', { api_key: apiKeyInput.trim() });
        setHasApiKey(true);
        setShowKeyForm(false);
    };

    const sendMessage = async (text) => {
        if (!text.trim() || streaming) return;

        const userMsg = { role: 'user', content: text };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setStreaming(true);

        // Add a placeholder for the assistant message
        const assistantMsg = { role: 'assistant', content: '' };
        setMessages([...newMessages, assistantMsg]);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    keywords: selectedKeywords,
                    messages: newMessages,
                    layer: layer
                })
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;
                setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'assistant', content: fullText };
                    return updated;
                });
            }
        } catch (err) {
            console.error('Chat error:', err);
            setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: '⚠️ Error connecting to Gemini API. Please check your API key.' };
                return updated;
            });
        } finally {
            setStreaming(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-[520px] bg-slate-900 border-l border-slate-700/50 flex flex-col z-50 shadow-2xl shadow-black/50">
            {/* Header */}
            <div className="h-14 border-b border-slate-700/50 px-5 flex items-center justify-between bg-slate-900/95 backdrop-blur-sm">
                <div className="flex items-center gap-2.5">
                    <div className="bg-violet-600 p-1.5 rounded-md">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-100">SEO Draft Assistant</h2>
                        <p className="text-[10px] text-slate-500">Gemini 3.1 Pro · Brand Standards v2.0</p>
                    </div>
                </div>
                <button onClick={() => { onClose(); setMessages([]); }} className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-800">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* API Key Form */}
            {showKeyForm && (
                <div className="p-5 border-b border-slate-700/50 bg-slate-800/50">
                    <div className="flex items-center gap-2 mb-3">
                        <Key className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Gemini API Key Required</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                        Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-blue-400 underline">Google AI Studio</a>
                    </p>
                    <div className="flex gap-2">
                        <input
                            type="password"
                            value={apiKeyInput}
                            onChange={(e) => setApiKeyInput(e.target.value)}
                            placeholder="Paste your API key here..."
                            className="flex-1 bg-slate-900 border border-slate-600 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                            onKeyDown={(e) => e.key === 'Enter' && saveApiKey()}
                        />
                        <button onClick={saveApiKey} className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-md transition-colors">
                            Save
                        </button>
                    </div>
                </div>
            )}

            {/* Selected Keywords Pills */}
            {selectedKeywords.length > 0 && (
                <div className="px-5 py-3 border-b border-slate-700/50 bg-slate-800/30">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">Selected Keywords</p>
                    <div className="flex flex-wrap gap-1.5">
                        {selectedKeywords.map((kw, i) => (
                            <span key={i} className="px-2 py-0.5 bg-violet-500/10 text-violet-300 text-[10px] font-medium rounded-full border border-violet-500/20">
                                {kw}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {messages.length === 0 && hasApiKey && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500">
                        <Sparkles className="w-8 h-8 mb-3 opacity-20" />
                        <p className="text-sm">Ready to draft your page outline</p>
                        <p className="text-xs mt-1">Select keywords and click "Draft Page Outline"</p>
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'assistant' && (
                            <div className="w-6 h-6 rounded-md bg-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Bot className="w-3.5 h-3.5 text-white" />
                            </div>
                        )}
                        <div className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                            ? 'bg-blue-600/20 border border-blue-500/20 text-blue-100'
                            : 'bg-slate-800/50 border border-slate-700/30 text-slate-200'
                            }`}>
                            {msg.role === 'assistant' ? (
                                msg.content === '' && streaming ? (
                                    <div className="flex items-center gap-3 py-1">
                                        <div className="flex gap-1">
                                            <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                        <span className="text-xs text-slate-400 italic">Thinking...</span>
                                    </div>
                                ) : (
                                    <div className="prose prose-invert prose-sm max-w-none prose-headings:text-slate-100 prose-p:text-slate-300 prose-li:text-slate-300 prose-strong:text-slate-100 prose-code:text-violet-300">
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                )
                            ) : (
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            )}
                        </div>
                        {msg.role === 'user' && (
                            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <User className="w-3.5 h-3.5 text-white" />
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-slate-700/50 p-4 bg-slate-900/95">
                <div className="flex gap-2">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={hasApiKey ? "Ask the AI to refine, expand, or change the draft..." : "Set your API key above first..."}
                        disabled={!hasApiKey || streaming}
                        rows={2}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-40"
                    />
                    <button
                        onClick={() => sendMessage(input)}
                        disabled={!hasApiKey || streaming || !input.trim()}
                        className="px-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-30 text-white rounded-lg transition-colors self-end h-10"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
