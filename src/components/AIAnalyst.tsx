import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Bot, User, Loader2, Sparkles, AlertCircle, Search, MapPin, Factory } from 'lucide-react';
import { type ParsedRefinery } from '../utils/data';
import axios from 'axios';
import RefineryDetail from './RefineryDetail';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const filteredRefineries = useMemo(() => {
    if (!searchTerm) return refineries;
    const lowerTerm = searchTerm.toLowerCase();
    return refineries.filter(r => 
      r.name.toLowerCase().includes(lowerTerm) || 
      r.company.toLowerCase().includes(lowerTerm) ||
      r.state.toLowerCase().includes(lowerTerm)
    );
  }, [refineries, searchTerm]);

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
        2. CRITICAL: When you mention a specific refinery by name, you MUST enclose it in TRIPLE CURLY BRACES like this: {{{Refinery Name}}}. This allows the user to click and view its details.
           Example: "The {{{Marathon Garyville Refinery}}} has a significant capacity..."
        3. Do NOT include Markdown links or other citation formats inside the braces. Just the plain name.
        4. You can perform calculations (e.g., total capacity for a specific company, average headcount in a region).
        5. If the user asks about "safety sensitive" or "turnaround" numbers, use the estimates provided in the data.
        6. If the data doesn't contain the answer, state that clearly based on the available dataset.
        7. Format your responses with clear headings, bullet points, or tables if appropriate for readability.
        8. The user is likely a vendor selling services to these refineries, so focus on commercial opportunities, operational scale, and workforce metrics.
      `;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
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
    // 1. Normalize AI output (handle the [[...]] or [..](..) hallucinations first)
    // Convert everything to our canonical {{{Refinery Name}}} format
    let cleanContent = content
      .replace(/\[(.*?)\]\(citation:(.*?)\)/g, '{{{$1}}}')
      .replace(/\[\[(.*?)\]\]/g, '{{{$1}}}');

    // 2. Convert {{{Refinery Name}}} to inline code blocks `citation:Refinery Name`
    // This prevents breaking tables/lists while allowing us to hijack the code renderer
    cleanContent = cleanContent.replace(/\{\{\{(.*?)\}\}\}/g, '`citation:$1`');

    // 3. Normalize table formatting to fix broken tables
    // Remove blank lines between table rows (often generated by AI)
    // Matches: Pipe-Row-Newline -> One or more Blank Lines -> Pipe-Row
    cleanContent = cleanContent.replace(/(^\|.*\|\s*\n)(\s*\n)+(\s*\|)/gm, '$1$3');
    
    // 4. General cleanup of excessive newlines
    cleanContent = cleanContent.replace(/\n{3,}/g, '\n\n');

    return (
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          // Hijack inline code to render citation buttons
          code: ({ node, className, children, ...props }) => {
            const content = String(children).replace(/\n$/, '');
            if (content.startsWith('citation:')) {
              const name = content.replace('citation:', '');
              return (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCitationClick(name);
                  }}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-sm font-medium cursor-pointer align-middle border-none align-baseline"
                  title={`View details for ${name}`}
                >
                  <Sparkles className="w-3 h-3" />
                  {name}
                </button>
              );
            }
            return <code className={className} {...props}>{children}</code>;
          },
          // Standard link styling for non-citation links
          a: ({ node, ...props }) => <a {...props} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" />,
          p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
          ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-4 mb-2" />,
          ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-4 mb-2" />,
          li: ({ node, ...props }) => <li {...props} className="mb-1" />,
          h1: ({ node, ...props }) => <h1 {...props} className="text-xl font-bold mb-2 mt-4" />,
          h2: ({ node, ...props }) => <h2 {...props} className="text-lg font-bold mb-2 mt-3" />,
          h3: ({ node, ...props }) => <h3 {...props} className="text-md font-bold mb-1 mt-2" />,
          table: ({ node, ...props }) => <div className="overflow-x-auto mb-4"><table {...props} className="min-w-full divide-y divide-gray-200 border border-gray-200" /></div>,
          thead: ({ node, ...props }) => <thead {...props} className="bg-gray-50" />,
          th: ({ node, ...props }) => <th {...props} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200" />,
          td: ({ node, ...props }) => <td {...props} className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 border-b border-gray-200" />,
        }}
      >
        {cleanContent}
      </ReactMarkdown>
    );
  };

  return (
    <div className="h-full w-full bg-gray-50 flex overflow-hidden">
      {/* Left Sidebar - Refinery List */}
      <div className="hidden md:flex w-96 bg-white border-r border-gray-200 flex-col h-full flex-shrink-0">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Refineries</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search refineries..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="mt-2 text-xs text-gray-500 font-medium">
            {filteredRefineries.length} Facilities
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto relative">
          {filteredRefineries.map((refinery) => (
            <button
              key={refinery.id}
              onClick={() => setSelectedRefinery(refinery)}
              className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors group ${selectedRefinery?.id === refinery.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
            >
              <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                {refinery.name}
              </div>
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <Factory className="w-3 h-3" />
                {refinery.company}
              </div>
              <div className="flex justify-between items-center mt-2">
                <div className="text-xs text-gray-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {refinery.state}
                </div>
                <div className="text-xs font-mono font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                  {(refinery.capacity / 1000).toFixed(0)}k bpd
                </div>
              </div>
            </button>
          ))}

          {/* Overlay Detail View */}
          {selectedRefinery && (
            <div className="absolute inset-0 bg-white z-10 flex flex-col animate-in slide-in-from-left-4 duration-200">
               <RefineryDetail 
                  refinery={selectedRefinery} 
                  onClose={() => setSelectedRefinery(null)} 
                  mode="sidebar"
                />
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI Analyst</h1>
            </div>
          </div>
          {selectedRefinery && (
            <button 
              onClick={() => setSelectedRefinery(null)} // Close the overlay in left sidebar if open
              className="hidden" // Hide this button as we are using left sidebar overlay
            >
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
                msg.role === 'user' ? 'bg-blue-600' : 'bg-white border border-gray-200'
              }`}>
                {msg.role === 'user' ? (
                  <User className="w-6 h-6 text-white" />
                ) : (
                  <Bot className="w-6 h-6 text-blue-600" />
                )}
              </div>
              
              <div className={`max-w-[80%] rounded-2xl px-6 py-4 shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
              }`}>
                <div className={`prose prose-sm max-w-none dark:prose-invert ${msg.role === 'user' ? 'whitespace-pre-wrap' : ''}`}>
                  {msg.role === 'model' ? renderMessageContent(msg.content) : msg.content}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                <Bot className="w-6 h-6 text-blue-600" />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none px-6 py-4 shadow-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
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
          <div className="relative w-full">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question"
              className="w-full pl-6 pr-14 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none shadow-sm text-gray-700 placeholder-gray-400 overflow-hidden"
              rows={1}
              disabled={isLoading}
              style={{ minHeight: '48px' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="absolute right-3 bottom-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Removed */}
    </div>
  );
};

export default AIAnalyst;
