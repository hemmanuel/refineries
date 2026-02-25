import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { type ParsedRefinery } from '../utils/data';
import axios from 'axios';

interface AIAnalystProps {
  refineries: ParsedRefinery[];
}

interface Message {
  role: 'user' | 'model';
  content: string;
}

const AIAnalyst: React.FC<AIAnalystProps> = ({ refineries }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: "Hello! I'm your AI Analyst. I have access to detailed data on all US refineries, including capacity, location, ownership, and workforce estimates. How can I help you research today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setError(null);

    try {
      // Prepare the system prompt with the data
      const systemPrompt = `
        You are an expert AI Analyst for the US Refining Industry. 
        You have access to the following dataset of US Refineries:
        ${JSON.stringify(refineries)}
        
        Your goal is to assist the user in researching specific items, analyzing trends, and providing insights based on this data.
        
        Guidelines:
        1. Be precise and cite specific refineries, companies, or PADD regions when answering.
        2. You can perform calculations (e.g., total capacity for a specific company, average headcount in a region).
        3. If the user asks about "safety sensitive" or "turnaround" numbers, use the estimates provided in the data.
        4. If the data doesn't contain the answer, state that clearly based on the available dataset.
        5. Format your responses with clear headings, bullet points, or tables if appropriate for readability.
        6. The user is likely a vendor selling services to these refineries, so focus on commercial opportunities, operational scale, and workforce metrics.
      `;

      // Prepare the API request payload
      // Using gemini-1.5-pro as it has the context window to handle the full dataset
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

  return (
    <div className="h-full w-full bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 shadow-sm">
        <div className="bg-purple-100 p-2 rounded-lg">
          <Sparkles className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI Analyst</h1>
          <p className="text-sm text-gray-500">Powered by Gemini 1.5 Pro • Access to full facility database</p>
        </div>
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
                {msg.content}
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

      <div className="p-6 bg-white border-t border-gray-200">
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
  );
};

export default AIAnalyst;
