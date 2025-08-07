import React, { useState, useEffect } from "react";
import { initSocket } from "../../Services/Admin/socket";
import { fetchAgents } from "../../Services/Admin/api";
import ConnectionStatus from "../../utils/Admin/ConnectionStatus";
import CpuCard from "../../utils/Admin/CpuCard";
import MemoryCard from "../../utils/Admin/MemoryCard";
import DiskCard from "../../utils/Admin/DiskCard";
import NetworkCard from "../../utils/Admin/NetworkCard";

const MAX_HISTORY = 10;

const Performance = () => {
  const [currentAgent, setCurrentAgent] = useState(null);
  const [agentData, setAgentData] = useState(null);
  const [agents, setAgents] = useState([]);
  const [history, setHistory] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");

  useEffect(() => {
    const socket = initSocket();

    const handleConnect = () => {
      setConnectionStatus("connected");
      loadAgents();
    };

    const handleDisconnect = () => {
      setConnectionStatus("disconnected");
    };

    const handleConnectError = () => {
      setConnectionStatus("connection error");
    };

    const handleSystemStats = (data) => {
      if (data.agent_name === currentAgent) {
        setAgentData(data.data);
        setHistory((prev) => {
          const newHistory = [...prev, { ...data.data, timestamp: new Date() }];
          return newHistory.length > MAX_HISTORY
            ? newHistory.slice(-MAX_HISTORY)
            : newHistory;
        });
      }
    };

    const handleAgentConnected = (data) => {
      console.log('Agent connected:', data);
      setAgents(data.agents);
      
      // If no agent is selected, select the newly connected one
      if (!currentAgent && data.agent_name) {
        setCurrentAgent(data.agent_name);
      }
    };

    const handleAgentDisconnected = (data) => {
      console.log('Agent disconnected:', data);
      setAgents(prevAgents => {
        const updatedAgents = prevAgents.filter(agent => !data.agents.includes(agent));
        
        // If the current agent was disconnected, select another one if available
        if (currentAgent && data.agents.includes(currentAgent)) {
          setCurrentAgent(updatedAgents.length > 0 ? updatedAgents[0] : null);
        }
        
        return updatedAgents;
      });
    };

    // Set up event listeners
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("system_stats", handleSystemStats);
    socket.on("agent_connected", handleAgentConnected);
    socket.on("agent_disconnected", handleAgentDisconnected);

    // Initial load
    loadAgents();

    return () => {
      // Clean up event listeners
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("system_stats", handleSystemStats);
      socket.off("agent_connected", handleAgentConnected);
      socket.off("agent_disconnected", handleAgentDisconnected);
      socket.disconnect();
    };
  }, [currentAgent]);

  const loadAgents = async () => {
    try {
      const agentList = await fetchAgents();
      setAgents(agentList);

      if (agentList.length > 0 && (!currentAgent || !agentList.includes(currentAgent))) {
        setCurrentAgent(agentList[0]);
      } else if (agentList.length === 0) {
        setCurrentAgent(null);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const handleAgentChange = (agentName) => {
    setCurrentAgent(agentName);
    setHistory([]);
  };

  return (
          <div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          zIndex: -10,
        }}
      />
    <div className="min-h-screen bg-gray-900 text-gray-100 px-4 py-6">
    <h1 className="text-3xl font-bold text-white mb-6 text-center animate-fade-in"></h1>
      {/* <h1>Real-Time System Performance Monitor</h1> */}
      <div>
      <ConnectionStatus
        status={connectionStatus}
        agents={agents}
        currentAgent={currentAgent}
        onAgentChange={handleAgentChange}
      />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <CpuCard data={agentData} history={history} />
        <MemoryCard data={agentData} history={history} />
        <DiskCard data={agentData} />
        <NetworkCard data={agentData} history={history} />
      </div>
    </div>
    </div>
  );
};

export default Performance;