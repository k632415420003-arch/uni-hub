/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Search, 
  Heart, 
  Handshake, 
  BookOpen, 
  ShoppingCart, 
  Zap, 
  Filter, 
  Trophy, 
  Sparkles, 
  CheckCircle2,
  PlusCircle,
  Compass,
  Bot,
  Send,
  X,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useRef } from 'react';

// Types
interface Post {
  id: number;
  category: string;
  time: string;
  title: string;
  author: string;
  karma: number;
  avatar: string;
  email?: string;
  contact?: string;
  details?: Record<string, any>;
}

interface Message {
  id: number;
  sender: string;
  content: string;
  timestamp: string;
}

interface ChatStatus {
  buyer_accepted: number;
  seller_accepted: number;
  buyer_completed: number;
  seller_completed: number;
}

export default function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<Post | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatStatus, setChatStatus] = useState<ChatStatus>({ 
    buyer_accepted: 0, 
    seller_accepted: 0, 
    buyer_completed: 0, 
    seller_completed: 0 
  });
  const [inputText, setInputText] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [userRole, setUserRole] = useState<'buyer' | 'seller'>('buyer');
  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUser = "Bạn"; // Mock current user

  useEffect(() => {
    fetchPosts();
    const interval = setInterval(fetchPosts, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/posts");
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error("Failed to fetch posts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeChat) {
      // Fetch history
      fetch(`/api/chat/${activeChat.id}`)
        .then(res => res.json())
        .then(data => {
          setMessages(data.messages);
          setChatStatus(data.status);
        });

      // Setup WebSocket
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}?chatId=${activeChat.id}`);
      socketRef.current = ws;

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'message') {
          setMessages(prev => [...prev, data]);
        } else if (data.type === 'status_update') {
          setChatStatus(data.status);
        }
      };

      return () => ws.close();
    }
  }, [activeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!inputText.trim() || !socketRef.current) return;
    socketRef.current.send(JSON.stringify({
      type: 'message',
      sender: currentUser,
      content: inputText
    }));
    setInputText("");
  };

  const acceptSupport = async () => {
    if (!activeChat) return;
    const res = await fetch(`/api/chat/${activeChat.id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: userRole })
    });
    const data = await res.json();
    setChatStatus(data);
  };

  const completeSupport = async () => {
    if (!activeChat) return;
    const res = await fetch(`/api/chat/${activeChat.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: userRole })
    });
    const data = await res.json();
    setChatStatus(data);
  };

  const handleCreatePost = () => {
    window.open("https://docs.google.com/forms/d/e/1FAIpQLSf2VOE6M-JfR2FB0YnLGxlAWrGQ6rvLi-F65WknAR5o2N9FVw/viewform?usp=sharing&ouid=111913882569183944486", "_blank");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-light">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 md:px-10 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 text-primary cursor-pointer" onClick={() => window.location.reload()}>
              <Bot className="w-8 h-8" />
              <h2 className="text-xl font-black leading-tight tracking-tight">Uni-Hub</h2>
            </div>
          </div>
          
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-slate-100 rounded-lg p-1">
                <button 
                  onClick={() => setUserRole('buyer')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${userRole === 'buyer' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}
                >
                  Người mua
                </button>
                <button 
                  onClick={() => setUserRole('seller')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${userRole === 'seller' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}
                >
                  Người bán
                </button>
              </div>
              <div className="hidden sm:flex items-center bg-slate-100 rounded-lg px-3 py-1.5">
              <Search className="text-slate-500 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Tìm kiếm hỗ trợ..." 
                className="bg-transparent border-none focus:ring-0 text-sm w-32 lg:w-48 outline-none ml-2"
              />
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg font-bold text-sm hover:bg-primary/20 transition-all">
                <Heart className="w-4 h-4 fill-primary" />
                <span>Karma: 1,250</span>
              </button>
              <div className="w-10 h-10 rounded-full border-2 border-primary overflow-hidden shadow-sm">
                <img 
                  src="https://picsum.photos/seed/user/100/100" 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-4 md:px-10 py-8 flex-grow">
        {/* Hero Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-12">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-6"
          >
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-widest uppercase">
              Mạng Lưới Kết Nối Sinh Viên 4.0
            </div>
            <h1 className="text-4xl md:text-6xl font-black leading-[1.1] tracking-tight text-slate-900">
              Uni-Hub - Nơi Sinh Viên <span className="text-primary">Giúp Đỡ</span> Nhau
            </h1>
            <p className="text-lg text-slate-600 font-medium">
              Cần là có - Sẵn lòng cho. Tham gia cộng đồng hỗ trợ học tập và đời sống sinh viên năng động nhất.
            </p>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={handleCreatePost}
                className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/30 hover:scale-105 transition-transform"
              >
                <PlusCircle className="w-5 h-5" />
                Tạo Bài Đăng
              </button>
              <button className="flex items-center gap-2 px-8 py-4 bg-white border border-slate-200 rounded-xl font-bold text-lg hover:bg-slate-50 transition-colors">
                <Compass className="w-5 h-5" />
                Khám Phá
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <div className="aspect-square rounded-[2rem] overflow-hidden shadow-2xl rotate-3 bg-primary/20 p-4">
              <img 
                src="https://picsum.photos/seed/students/800/800" 
                alt="Students" 
                className="w-full h-full object-cover rounded-2xl -rotate-3 transition-transform hover:rotate-0 duration-500"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl flex items-center gap-4 border border-slate-100">
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Mới nhất</p>
                <p className="font-bold">Đã giúp 500+ sinh viên</p>
              </div>
            </div>
          </motion.div>
        </section>

        <div className="flex flex-col gap-10">
          {/* Live Posts Section */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">Tin đăng mới nhất</h2>
              <div className="flex gap-2">
                <button className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200">
                  <Filter className="w-4 h-4" />
                </button>
                <button className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-bold">
                  Tất cả
                </button>
              </div>
            </div>
            
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {posts.map((post) => (
                  <motion.div 
                    key={post.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    onClick={() => {
                      setActiveChat(post);
                      setShowDetails(true);
                    }}
                    className="p-5 rounded-2xl bg-white border border-slate-200 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-primary/50"
                  >
                    <div className="flex justify-between items-start">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-600`}>
                        {post.category}
                      </span>
                      <span className="text-slate-400 text-[10px]">{post.time}</span>
                    </div>
                    <h4 className="text-lg font-bold leading-tight h-12 line-clamp-2">
                      {post.title}
                    </h4>
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                          <img src={post.avatar} alt={post.author} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-none">{post.author}</p>
                          <p className="text-[10px] text-red-500 flex items-center gap-0.5">
                            <Heart className="w-2.5 h-2.5 fill-red-500" /> {post.karma} Karma
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveChat(post)}
                        className="px-4 py-1.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Phản hồi
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            
            <div className="mt-8 text-center">
              <button className="text-primary font-bold hover:underline">Xem thêm tin đăng...</button>
            </div>
          </div>
        </div>
      </main>

      {/* Chat Modal */}
      <AnimatePresence>
        {activeChat && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col h-[600px] overflow-hidden"
            >
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center justify-between bg-primary text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/50">
                    <img src={activeChat.avatar} alt={activeChat.author} className="w-full h-full object-cover" />
                  </div>
                  <div 
                    className="cursor-pointer"
                    onClick={() => setShowDetails(!showDetails)}
                  >
                    <h3 className="font-bold leading-none flex items-center gap-2">
                      {activeChat.author}
                      <Compass className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                    </h3>
                    <p className="text-xs opacity-80 mt-1 line-clamp-1">Đang hỗ trợ: {activeChat.title}</p>
                  </div>
                </div>
                <button onClick={() => { setActiveChat(null); setShowDetails(false); }} className="p-2 hover:bg-white/10 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Detail View Overlay */}
              <AnimatePresence>
                {showDetails && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-slate-100 border-b overflow-y-auto max-h-[300px]"
                  >
                    <div className="p-4 space-y-3">
                      <h4 className="font-bold text-sm text-slate-700 uppercase tracking-wider">Chi tiết bài đăng</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {activeChat.details && Object.entries(activeChat.details).map(([key, value]) => {
                          if (key.toLowerCase().includes('email') || key.toLowerCase().includes('sđt') || key.toLowerCase().includes('liên hệ') || key.toLowerCase().includes('contact')) {
                            const isAccepted = (userRole === 'buyer' && chatStatus.buyer_accepted) || (chatStatus.buyer_accepted && chatStatus.seller_accepted);
                            return (
                              <div key={key} className="bg-white p-2 rounded-lg border border-slate-200">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">{key}</p>
                                <p className="text-xs font-medium">
                                  {isAccepted ? (value || 'N/A') : '******** (Chấp nhận hỗ trợ để xem)'}
                                </p>
                              </div>
                            );
                          }
                          return (
                            <div key={key} className="bg-white p-2 rounded-lg border border-slate-200">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">{key}</p>
                              <p className="text-xs font-medium">{value || 'N/A'}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === currentUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                      msg.sender === currentUser 
                        ? 'bg-primary text-white rounded-tr-none' 
                        : 'bg-white text-slate-800 shadow-sm rounded-tl-none'
                    }`}>
                      <p>{msg.content}</p>
                      <p className={`text-[10px] mt-1 opacity-70 ${msg.sender === currentUser ? 'text-right' : 'text-left'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Status / Completion */}
              <div className="p-3 bg-slate-100 border-t flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Bạn ({userRole === 'buyer' ? 'Mua' : 'Bán'})</p>
                      <div className="flex gap-1">
                        <div className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                          (userRole === 'buyer' ? chatStatus.buyer_accepted : chatStatus.seller_accepted) 
                            ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-400'
                        }`}>NHẬN</div>
                        <div className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                          (userRole === 'buyer' ? chatStatus.buyer_completed : chatStatus.seller_completed) 
                            ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'
                        }`}>XONG</div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Đối tác ({userRole === 'buyer' ? 'Bán' : 'Mua'})</p>
                      <div className="flex gap-1">
                        <div className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                          (userRole === 'buyer' ? chatStatus.seller_accepted : chatStatus.buyer_accepted) 
                            ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-400'
                        }`}>NHẬN</div>
                        <div className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                          (userRole === 'buyer' ? chatStatus.seller_completed : chatStatus.buyer_completed) 
                            ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'
                        }`}>XONG</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={acceptSupport}
                      disabled={(userRole === 'buyer' ? chatStatus.buyer_accepted : chatStatus.seller_accepted) === 1}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                        (userRole === 'buyer' ? chatStatus.buyer_accepted : chatStatus.seller_accepted) 
                          ? 'bg-slate-200 text-slate-500 cursor-not-allowed' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      Nhận hỗ trợ
                    </button>
                    <button 
                      onClick={completeSupport}
                      disabled={(userRole === 'buyer' ? chatStatus.buyer_completed : chatStatus.seller_completed) === 1}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                        (userRole === 'buyer' ? chatStatus.buyer_completed : chatStatus.seller_completed) 
                          ? 'bg-slate-200 text-slate-500 cursor-not-allowed' 
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      Hoàn thành hỗ trợ
                    </button>
                  </div>
                </div>

                {chatStatus.buyer_completed && chatStatus.seller_completed && (
                  <div className="w-full space-y-3">
                    <div className="bg-green-100 text-green-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Hỗ trợ đã hoàn tất!
                    </div>
                    {!reviewSubmitted ? (
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Để lại nhận xét cho đối tác:</p>
                        <textarea 
                          value={reviewText}
                          onChange={(e) => setReviewText(e.target.value)}
                          placeholder="Nhận xét của bạn..."
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-primary resize-none h-16"
                        />
                        <button 
                          onClick={() => setReviewSubmitted(true)}
                          className="w-full py-1.5 bg-primary text-white text-[10px] font-bold rounded-lg hover:bg-primary/90"
                        >
                          Gửi nhận xét
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-2 text-[10px] text-slate-400 font-medium italic">
                        Cảm ơn bạn đã đóng góp cho cộng đồng!
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t flex items-center gap-2">
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 bg-slate-100 border-none focus:ring-2 focus:ring-primary rounded-xl px-4 py-2 text-sm outline-none"
                />
                <button 
                  onClick={sendMessage}
                  className="p-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-20 border-t border-slate-200 py-10 bg-white px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-primary">
            <Bot className="w-6 h-6" />
            <h2 className="text-lg font-black leading-tight">Uni-Hub</h2>
          </div>
          <p className="text-sm text-slate-500">© 2024 Uni-Hub. Kết nối sinh viên toàn quốc.</p>
          <div className="flex gap-6">
            {['Về chúng tôi', 'Điều khoản', 'Bảo mật'].map((link) => (
              <a key={link} href="#" className="text-sm text-slate-500 hover:text-primary transition-colors">
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
