import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, AlertCircle, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { type ParsedRefinery } from '../utils/data';
import axios from 'axios';
import RefineryDetail from './RefineryDetail';

interface AIAnalystProps {
  refineries: ParsedRefinery[];
}

interface Message {
  role: 'user' | 'model';
  content: string;
}

const AIAnalyst: React.FC<AIAnalystProps> = ({ refineries }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: "Hello! I'm your AI Analyst. I have access to detailed data on all US refineries. Ask me about capacity, workforce estimates, or specific facilities. I can cite specific refineries for you to explore." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRefinery, setSelectedRefinery] = useState<ParsedRefinery | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Open sidebar when a refinery is selected
  useEffect(() => {
    if (selectedRefinery) {
      setSidebarOpen(true);
    }
  }, [selectedRefinery]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setError(null);

    try {
      const systemPrompt = `
        You are an expert AI Analyst for the US Refining Industry. 
        You have access to the following dataset of US Refineries:
        ${JSON.stringify(refineries)}
        
        Your goal is to assist the user in researching specific items, analyzing trends, and providing insights based on this data.
        
        Guidelines:
        1. Be precise and cite specific refineries, companies, or PADD regions when answering.
        2. CRITICAL: When you mention a specific refinery by name, you MUST enclose it in double brackets like this: [[Refinery Name]]. This allows the user to click and view its details.
           Example: "The [[Marathon Garyville Refinery]] has a significant capacity..."
        3. You can perform calculations (e.g., total capacity for a specific company, average headcount in a region).
        4. If the user asks about "safety sensitive" or "turnaround" numbers, use the estimates provided in the data.
        5. If the data doesn't contain the answer, state that clearly based on the available dataset.
        6. Format your responses with clear headings, bullet points, or tables if appropriate for readability.
        7. The user is likely a vendor selling services to these refineries, so focus on commercial opportunities, operational scale, and workforce metrics.
      `;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        {
          contents: [
            {
              role: "user",
              parts: [{ text: systemPrompt + "\n\nUser Question: " + userMessage }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        }
      );

      const aiResponse = response.data.candidates[0].content.parts[0].text;
      setMessages(prev => [...prev, { role: 'model', content: aiResponse }]);
    } catch (err) {
      console.error("Error calling Gemini API:", err);
      setError("Failed to get a response from the AI Analyst. Please check your API key or try again.");
      setMessages(prev => [...prev, { role: 'model', content: "I apologize, but I encountered an error processing your request. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCitationClick = (refineryName: string) => {
    const refinery = refineries.find(r => r.name.toLowerCase() === refineryName.toLowerCase());
    if (refinery) {
      setSelectedRefinery(refinery);
    } else {
      console.warn(`Refinery not found: ${refineryName}`);
    }
  };

  // Helper to parse message content and render citations
  const renderMessageContent = (content: string) => {
    const parts = content.split(/(\[\[.*?\]\])/g);
    return parts.map((part, index) => {
      if (part.startsWith('[[') && part.endsWith(']]')) {
        const name = part.slice(2, -2);
        return (
          <button
            key={index}
            onClick={() => handleCitationClick(name)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-sm font-medium cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            {name}
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="h-full w-full bg-gray-50 flex overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI Analyst</h1>
              <p className="text-sm text-gray-500">Powered by Gemini 1.5 Pro • Access to full facility database</p>
            </div>
          </div>
          {selectedRefinery && !sidebarOpen && (
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 flex items-center gap-2 text-sm font-medium"
            >
              <ChevronLeft className="w-4 h-4" />
              Open Sidebar
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-blue-100' : 'bg-purple-100'
              }`}>
                {msg.role === 'user' ? (
                  <User className="w-6 h-6 text-blue-600" />
                ) : (
                  <Bot className="w-6 h-6 text-purple-600" />
                )}
              </div>
              
              <div className={`max-w-[80%] rounded-2xl px-6 py-4 shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
              }`}>
                <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                  {msg.role === 'model' ? renderMessageContent(msg.content) : msg.content}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Bot className="w-6 h-6 text-purple-600" />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none px-6 py-4 shadow-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                <span className="text-sm text-gray-500">Analyzing data...</span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="flex justify-center">
              <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 bg-white border-t border-gray-200 flex-shrink-0">
          <div className="max-w-4xl mx-auto relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about specific refineries, regional trends, or workforce estimates..."
              className="w-full pl-6 pr-14 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none shadow-sm text-gray-700 placeholder-gray-400"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-3">
            AI can make mistakes. Please verify important information.
          </p>
        </div>
      </div>

      {/* Right Sidebar */}
      {sidebarOpen && (
        <div className="w-96 border-l border-gray-200 bg-white shadow-xl flex flex-col h-full flex-shrink-0 transition-all duration-300">
          {selectedRefinery ? (
            <RefineryDetail 
              refinery={selectedRefinery} 
              onClose={() => setSidebarOpen(false)} 
              mode="sidebar"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center">
              <Sparkles className="w-12 h-12 mb-4 text-gray-200" />
              <p>Select a refinery from the chat to view details here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIAnalyst;
