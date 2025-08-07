import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { SendHorizonal } from "lucide-react";

const ChatWindow = ({ selectedUser, onMessagesUpdate }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const currentUser = JSON.parse(localStorage.getItem("authUser"));
  const messagesContainerRef = useRef(null);
  const pollingRef = useRef(null);

  const fetchMessages = async () => {
    if (!selectedUser || !currentUser) return;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/messages/${selectedUser._id}`,
        {
          headers: {
            Authorization: `Bearer ${currentUser.token}`,
          },
        }
      );
      const data = await res.json();
      setMessages(data);
      onMessagesUpdate();
    } catch (err) {
      console.error("Error fetching messages:", err);
      toast.error("Failed to load messages");
    }
  };

  // Fetch messages initially and clear polling on unmount
  useEffect(() => {
    setMessages([]);
    fetchMessages();

    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(fetchMessages, 3000);

    return () => clearInterval(pollingRef.current);
  }, [selectedUser]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setSending(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/messages/send/${selectedUser._id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentUser.token}`,
          },
          body: JSON.stringify({ text: input }),
        }
      );

      if (!res.ok) throw new Error("Failed to send message");

      const savedMessage = await res.json();
      setMessages((prev) => [...prev, savedMessage]);
      onMessagesUpdate();
      setInput("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  if (!selectedUser) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-lg">
        Select a user to start chatting
      </div>
    );
  }

  return (
    <div className="w-full h-[80vh] flex justify-center items-center">
      <div className="flex flex-col w-full max-w-[700px] h-full bg-[#1e1e1e]/90 rounded-3xl shadow-xl border border-[#333] backdrop-blur-md text-white">
        {/* Header */}
        <div className="p-6 border-b border-[#333] bg-[#111] flex items-center gap-3 rounded-t-3xl">
          <img
            src={
              selectedUser.profilePic ||
              `https://avatar.iran.liara.run/public/boy?username=${selectedUser.username}`
            }
            alt={selectedUser.username}
            className="w-12 h-12 rounded-full object-cover border border-cyan-400"
          />
          <span className="font-semibold text-xl text-cyan-400">
            {selectedUser.username}
          </span>
        </div>

        {/* Scrollable Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#111]/80"
        >
          {messages.map((msg, index) => {
            const senderId =
              typeof msg.sender === "string" ? msg.sender : msg.sender?._id;
            const isCurrentUser = senderId === currentUser._id;
            const time = new Date(msg.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={msg._id ?? index}
                className={`flex flex-col ${
                  isCurrentUser ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`flex items-end gap-3 ${
                    isCurrentUser ? "flex-row-reverse" : ""
                  }`}
                >
                  <img
                    src={
                      isCurrentUser
                        ? currentUser.profilePic ||
                          `https://avatar.iran.liara.run/public/boy?username=${currentUser.username}`
                        : selectedUser.profilePic ||
                          `https://avatar.iran.liara.run/public/boy?username=${selectedUser.username}`
                    }
                    alt="Sender"
                    className="w-9 h-9 rounded-full border border-gray-700"
                  />
                  <div
                    className={`max-w-xs px-5 py-3 rounded-2xl text-sm ${
                      isCurrentUser
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-black"
                        : "bg-[#2a2a2a] text-white"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 mt-0.5">{time}</span>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[#333] bg-[#111] flex gap-4 rounded-b-3xl">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-[#1a1a1a] text-white placeholder-gray-500 rounded-xl px-5 py-3 border border-[#444] focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm caret-white"
            placeholder="Type a message..."
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={sending}
          />
          <button
            onClick={handleSend}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-2 rounded shadow-md hover:brightness-110 transition"
          >
            <span>Send</span>
            <SendHorizonal
              size={20}
              className="animate-pulse hover:scale-110 transition-transform duration-200"
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
