import React, { useState, useRef, useEffect } from "react";
import UserList from "../components/Chat/UserList";
import ChatWindow from "../components/Chat/ChatWindow";
import DashNav from "../components/DashNav";
import FloatingBackground from "../components/FloatingBackground";
import Sidebar from "../components/Sidebar";

const ChatLayout = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const chatWindowRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [messageUpdateTrigger, setMessageUpdateTrigger] = useState(0);

  // Handle auto-scrolling
  useEffect(() => {
    if (chatWindowRef.current && isAtBottom) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [selectedUser, messageUpdateTrigger]);

  const handleScroll = () => {
    if (chatWindowRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatWindowRef.current;
      const atBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 50;
      setIsAtBottom(atBottom);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white font-sans relative">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-gray-900/90 border-b border-gray-800/50 backdrop-blur-md z-50">
        <DashNav />
        <Sidebar active="chat" />
      </header>

      {/* Main Content */}
      <div className="flex flex-1 mt-20 ml-80 p-6">
        <main className="flex-1 flex flex-col lg:flex-row gap-6 w-full">
          {/* User List */}
          <div className="w-full lg:w-1/4 border-r border-blue-300">
            <UserList
              onSelectUser={setSelectedUser}
              selectedUser={selectedUser}
            />
          </div>

          {/* Chat Window */}
          <div
            ref={chatWindowRef}
            onScroll={handleScroll}
            className="w-full lg:w-3/4"
          >
            <ChatWindow
              selectedUser={selectedUser}
              onMessagesUpdate={() =>
                setMessageUpdateTrigger((prev) => prev + 1)
              }
            />
          </div>
        </main>
        <FloatingBackground />
      </div>
    </div>
  );
};

export default ChatLayout;
