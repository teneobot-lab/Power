import React, { useState, useRef, useEffect } from 'react';
import { InventoryItem, ChatMessage } from '../types';
import { chatWithInventoryBot, getInventoryInsights } from '../services/geminiService';
import { Send, Bot, User, Sparkles, Loader2, BarChart2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AIAssistantProps {
  items: InventoryItem[];
}

const AIAssistant: React.FC<AIAssistantProps> = ({ items }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'model',
      text: 'Establishing secure link to Gemini Core... System ready. I am your SmartStock Agent. How can I assist with your supply chain nodes today?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    const responseText = await chatWithInventoryBot(inputValue, items);

    const modelMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, modelMsg]);
    setIsLoading(false);
  };

  const handleGenerateReport = async () => {
    if (isLoading) return;
    
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      text: "Synthesize full inventory pattern analysis and generate core insights report.",
      timestamp: new Date()
    }]);
    
    setIsLoading(true);
    const report = await getInventoryInsights(items);
    
    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: report,
      timestamp: new Date()
    }]);
    setIsLoading(false);
  };

  return (
    <div className="h-full flex flex-col glass-panel rounded-[2.5rem] overflow-hidden border border-white/5">
      {/* Header */}
      <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02] flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-[#6D5DF6]/20 p-3 rounded-2xl border border-[#6D5DF6]/30">
            <Sparkles className="w-5 h-5 text-[#6D5DF6]" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-tighter uppercase font-manrope">Gemini Core</h3>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Advanced Neural Analysis</p>
          </div>
        </div>
        <button 
          onClick={handleGenerateReport}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-30"
        >
          <BarChart2 className="w-4 h-4 text-[#22D3EE]" />
          Generate Report
        </button>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex gap-5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`
              w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0
              ${msg.role === 'user' ? 'bg-[#6D5DF6] text-white shadow-lg' : 'bg-[#0F172A] border border-white/10 text-[#22D3EE]'}
            `}>
              {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
            </div>
            
            <div className={`
              max-w-[75%] rounded-[1.5rem] px-6 py-4 text-[13px] font-medium leading-relaxed
              ${msg.role === 'user' 
                ? 'bg-[#6D5DF6] text-white rounded-tr-none' 
                : 'bg-white/5 text-slate-300 border border-white/5 rounded-tl-none prose prose-invert prose-sm max-w-none'}
            `}>
               {msg.role === 'model' ? (
                 <ReactMarkdown>{msg.text}</ReactMarkdown>
               ) : (
                 msg.text
               )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-5">
             <div className="w-10 h-10 rounded-2xl bg-[#0F172A] border border-white/10 text-[#22D3EE] flex items-center justify-center flex-shrink-0">
               <Bot size={20} />
             </div>
             <div className="bg-white/5 border border-white/5 px-6 py-4 rounded-[1.5rem] rounded-tl-none flex items-center gap-4">
                <Loader2 className="w-4 h-4 animate-spin text-[#22D3EE]" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Processing Data...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-8 bg-white/[0.02] border-t border-white/5 flex-shrink-0">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-4"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Query terminal..."
            className="flex-1 px-8 py-5 bg-white/5 border border-white/10 rounded-[1.5rem] focus:ring-2 focus:ring-[#6D5DF6]/50 outline-none text-sm transition-all font-medium placeholder:text-slate-700"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={!inputValue.trim() || isLoading}
            className="p-5 bg-[#6D5DF6] text-white rounded-2xl hover:bg-[#5B4EDB] disabled:opacity-30 transition-all shadow-xl shadow-indigo-500/10"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIAssistant;