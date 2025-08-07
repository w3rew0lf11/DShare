import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DShareChatbot = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatboxRef = useRef(null);
  const [isConnected, setIsConnected] = useState(true);

  const [connectionPulse, setConnectionPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionPulse(true);
      setTimeout(() => setConnectionPulse(false), 1000);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleChat = () => setIsChatOpen(prev => !prev);

  const sendMessage = async () => {
    if (input.trim() === '' || isSending) return;

    const userMsg = { text: input.trim(), sender: 'user', id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const response = await fetch(
        `${import.meta.env.VITE_CHAT_URL}/get`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMsg.text }),
        }
      );
      const data = await response.json();

      const botMsg = {
        text: data.reply || "Sorry, I didn't get that. Please try again.",
        sender: 'bot',
        id: Date.now() + 1
      };
      
      setMessages(prev => [...prev, botMsg]);
      
      if (typeof window !== 'undefined') {
        new Audio('https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3').play();
      }
    } catch (err) {
      console.error('Backend error:', err);
      setMessages(prev => [...prev, { 
        text: "⚠️ Error connecting to blockchain network", 
        sender: 'bot',
        id: Date.now() + 1
      }]);
      setIsConnected(false);
      setTimeout(() => setIsConnected(true), 3000);
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (chatboxRef.current) {
      chatboxRef.current.scrollTo({
        top: chatboxRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isChatOpen]);

  const BlockchainParticles = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute bg-blue-400 rounded-full"
          style={{
            width: Math.random() * 4 + 2,
            height: Math.random() * 4 + 2,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -100],
            x: [0, (Math.random() - 0.5) * 50],
            opacity: [0.8, 0],
          }}
          transition={{
            duration: Math.random() * 3 + 2,
            repeat: Infinity,
            repeatType: "loop",
            delay: Math.random() * 5,
          }}
        />
      ))}
    </div>
  );

  return (
    <>
      {/* Floating Chat Button */}
      <motion.button
        onClick={toggleChat}
        aria-label={isChatOpen ? "Close chat" : "Open chat"}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-full shadow-2xl z-50 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-400/50"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          rotate: isChatOpen ? 180 : 0,
          transition: { type: 'spring', stiffness: 300, damping: 20 }
        }}
      >
        <AnimatePresence mode="wait">
          {isChatOpen ? (
            <motion.svg
              key="close"
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </motion.svg>
          ) : (
            <motion.div
              key="open"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative"
            >
              <img
                src="https://cdn-icons-png.flaticon.com/512/4712/4712035.png"
                alt="Open Chat"
                className="w-8 h-8"
                loading="lazy"
              />
              {isConnected && (
                <motion.div
                  className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"
                  animate={{
                    scale: connectionPulse ? [1, 1.5, 1] : 1,
                    opacity: connectionPulse ? [1, 0.5, 1] : 1
                  }}
                  transition={{ duration: 1 }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 w-full max-w-md bg-white rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden"
            style={{ height: '70vh', maxHeight: '600px', width: 'calc(100% - 3rem)' }}
            role="region"
            aria-live="polite"
            aria-label="Chatbot window"
          >
            <BlockchainParticles />
            
            {/* Header */}
            <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-4 flex items-center justify-between select-none relative overflow-hidden">
              <div className="flex items-center space-x-3 z-10">
                <motion.div
                  animate={{
                    rotate: [0, 360],
                    transition: { repeat: Infinity, duration: 10, ease: "linear" }
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="w-8 h-8 text-white fill-current"
                  >
                    <path d="M12 2L4 7v10l8 5 8-5V7L12 2zm0 2.5L18 9v6l-6 3.5-6-3.5V9l6-3.5z" />
                    <path d="M12 16.5l6-3.5V9l-6 3.5-6-3.5v4l6 3.5z" />
                  </svg>
                </motion.div>
                <div>
                  <h2 className="font-semibold text-lg">DShare Blockchain Assistant</h2>
                  <div className="flex items-center space-x-1">
                    <motion.div
                      className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}
                      animate={{
                        scale: [1, 1.2, 1],
                        transition: { repeat: Infinity, duration: 2 }
                      }}
                    />
                    <p className="text-xs opacity-80">
                      {isConnected ? 'Connected to network' : 'Connecting...'}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={toggleChat}
                aria-label="Close chat"
                className="text-2xl hover:text-red-200 transition-colors focus:outline-none z-10"
              >
                &times;
              </button>
              
              <motion.div 
                className="absolute bottom-0 left-0 right-0 h-1 bg-blue-400"
                animate={{
                  backgroundPosition: ['0% 0%', '100% 0%'],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                style={{
                  background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%)',
                  backgroundSize: '200% 100%',
                }}
              />
            </header>

            {/* Messages Area */}
            <main
              ref={chatboxRef}
              className="flex-1 px-4 py-4 bg-gradient-to-b from-gray-50 to-gray-100 overflow-y-auto space-y-3 scroll-smooth"
            >
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col items-center justify-center h-full text-center px-4"
                >
                  <motion.div
                    className="relative mb-6"
                    animate={{
                      y: [0, -10, 0],
                      transition: { repeat: Infinity, duration: 3 }
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="w-16 h-16 text-indigo-400 fill-current"
                    >
                      <path d="M12 2L4 7v10l8 5 8-5V7L12 2zm0 2.5L18 9v6l-6 3.5-6-3.5V9l6-3.5z" />
                      <path d="M12 16.5l6-3.5V9l-6 3.5-6-3.5v4l6 3.5z" />
                    </svg>
                    <motion.div
                      className="absolute -inset-2 border-2 border-indigo-300 rounded-full"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 0, 0.5],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                      }}
                    />
                  </motion.div>
                  <p className="text-gray-500 max-w-xs">
                    Ask me anything about blockchain, DeFi, or Web3 technologies!
                  </p>
                  <motion.div
                    className="mt-4 text-xs text-gray-400 border border-gray-200 rounded-full px-3 py-1"
                    animate={{
                      scale: [1, 1.05, 1],
                      transition: { repeat: Infinity, duration: 3 }
                    }}
                  >
                    Try: "Explain NFTs in simple terms"
                  </motion.div>
                </motion.div>
              )}

              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    transition: { 
                      duration: 0.3,
                      ...(msg.sender === 'bot' ? { delay: 0.5 } : {})
                    }
                  }}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  aria-live="off"
                >
                  <motion.div
                    className={`
                      max-w-[85%] px-4 py-3 text-sm rounded-2xl relative overflow-hidden
                      ${msg.sender === 'user' 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-br-none' 
                        : 'bg-white text-gray-800 rounded-bl-none shadow-sm'}
                      whitespace-pre-wrap
                    `}
                    whileHover={{ scale: 1.02 }}
                  >
                    {msg.sender === 'bot' && msg.text.includes("transaction") && (
                      <motion.div
                        className="absolute inset-0 bg-blue-400 opacity-10"
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 1.5 }}
                      />
                    )}
                    {msg.text}
                    
                    {msg.sender === 'user' && (
                      <motion.div
                        className="absolute bottom-1 right-2 text-xs opacity-70"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.7 }}
                        transition={{ delay: 0.5 }}
                      >
                        ✓ Sent
                      </motion.div>
                    )}
                  </motion.div>
                </motion.div>
              ))}
              
              {isSending && (
                <motion.div 
                  className="flex justify-start"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="bg-white text-gray-800 rounded-bl-none max-w-[70%] px-4 py-3 text-sm shadow-sm relative overflow-hidden">
                    <div className="flex space-x-2 items-center">
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <motion.div
                      className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-400 to-indigo-400"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                </motion.div>
              )}
            </main>

            {/* Input Area */}
            <footer className="border-t border-gray-200 px-4 py-3 flex items-center space-x-3 bg-white relative">
              <motion.div 
                className="flex-1 relative"
                whileHover={{ scale: 1.01 }}
              >
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message or /command..."
                  className="w-full rounded-full border border-gray-300 px-4 py-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label="Chat message input"
                  disabled={isSending}
                  autoComplete="off"
                />
                {input.length > 0 && (
                  <motion.button
                    onClick={() => setInput('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileHover={{ scale: 1.2 }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                )}
              </motion.div>
              
              <motion.button
                onClick={sendMessage}
                disabled={isSending || input.trim() === ''}
                className={`
                  bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full p-2
                  disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden
                  focus:outline-none focus:ring-4 focus:ring-blue-400/50
                  w-10 h-10 flex items-center justify-center
                `}
                aria-label="Send message"
                whileHover={{ scale: input.trim() !== '' ? 1.1 : 1 }}
                whileTap={{ scale: 0.9 }}
                animate={{
                  scale: input.trim() !== '' && !isSending ? [1, 1.05, 1] : 1,
                  transition: { repeat: Infinity, duration: 2 }
                }}
              >
                {isSending ? (
                  <motion.div
                    className="absolute inset-0 bg-white opacity-20"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                ) : null}
                {/* Blockchain-themed arrow icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 19V5" />
                  <path d="M5 12l7-7 7 7" />
                </svg>
              </motion.button>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DShareChatbot;