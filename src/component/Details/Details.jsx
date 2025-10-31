import React, { useState, useEffect, useRef } from "react";
import {
  IoCheckmark,
  IoCheckmarkDone,
  IoCheckmarkDoneSharp,
} from "react-icons/io5";
import { IoIosSend } from "react-icons/io";
import { BsEmojiSmile } from "react-icons/bs";
import { HiOutlinePhotograph } from "react-icons/hi";
import { SlCallEnd, SlCamrecorder } from "react-icons/sl";
import axios from "axios";
import socket from "../../utils/socket";

function Details({ user }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem("user"));
  const currentUserId = currentUser?._id;

  // Join socket room for current user every time user changes
  useEffect(() => {
    if (currentUserId) {
      socket.emit("join", currentUserId);
    }
    return () => {
      socket.emit("leave", currentUserId);
    };
  }, [currentUserId]);

  // Fetch messages when chat partner (user) changes
  useEffect(() => {
    if (!user?._id) return;

    socket.emit("join", user._id);

    (async () => {
      const { data } = await axios.get(
        `http://localhost:5000/api/messages/${currentUserId}/${user._id}`
      );
      setMessages(data);
    })();
    // On chat open, mark unread as read
    socket.emit("messageRead", {
      chatWith: user._id,
      readerId: currentUserId,
    });
  }, [user, currentUserId]);

  // Send message via socket
  const handleSend = () => {
    if (!message.trim()) return;
    const msg = {
      senderId: currentUserId,
      receiverId: user._id,
      message,
      timestamp: Date.now(),
    };
    // Optimistically add to UI
    setMessages((prev) => [...prev, { ...msg, status: "sent", _id: Date.now().toString() }]);
    socket.emit("sendMessage", msg);
    setMessage("");
  };

  // Listen for receiveMessage (real-time)
  useEffect(() => {
    const recv = (data) => {
      setMessages((prev) => [...prev, data]);
      // On incoming, auto-deliver/read
      if (data.receiverId === currentUserId) {
        socket.emit("messageDelivered", {
          messageId: data._id,
          senderId: data.senderId,
        });
        setTimeout(() => {
          socket.emit("messageRead", {
            messageId: data._id,
            senderId: data.senderId,
          });
        }, 500);
      }
    };
    socket.on("receiveMessage", recv);
    return () => socket.off("receiveMessage", recv);
  }, [user, currentUserId]);

  // Listen for messageDelivered, messageRead
  useEffect(() => {
    const delivered = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, status: "delivered" } : msg
        )
      );
    };
    const read = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, status: "read" } : msg
        )
      );
    };
    socket.on("messageDelivered", delivered);
    socket.on("messageRead", read);
    return () => {
      socket.off("messageDelivered", delivered);
      socket.off("messageRead", read);
    };
  }, []);

  // Scroll chat to latest message
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Tick icon for status
  const tick = (status) =>
    status === "sent" ? (
      <IoCheckmark size={15} className="ml-1 text-gray-400 inline" />
    ) : status === "delivered" ? (
      <IoCheckmarkDone size={15} className="ml-1 text-gray-500 inline" />
    ) : status === "read" ? (
      <IoCheckmarkDoneSharp size={15} className="ml-1 text-blue-400 inline" />
    ) : null;

  return (
    <div className="w-[70%] h-[480px] border-x-2 bg-white shadow-lg rounded-xl flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center border-b p-4 bg-blue-100 rounded-t-xl">
        <div className="flex items-center gap-4">
          <img
            src={user.img || "https://cdn-icons-png.flaticon.com/512/3177/3177440.png"}
            alt={user.name}
            className="h-12 w-12 rounded-full object-cover border"
          />
          <div>
            <p className="font-semibold text-lg">{user.name}</p>
            <p className="text-xs text-gray-500">Active recently</p>
          </div>
        </div>
        <div className="flex gap-3 text-xl text-blue-400">
          <SlCallEnd className="hover:text-red-400 cursor-pointer" />
          <SlCamrecorder className="hover:text-green-400 cursor-pointer" />
        </div>
      </div>

      {/* Chat */}
      <div className="p-5 h-[320px] overflow-y-auto flex flex-col gap-2 bg-gray-50">
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`p-3 rounded-lg shadow-sm max-w-[70%] ${
              msg.senderId === currentUserId
                ? "bg-blue-200 ml-auto"
                : "bg-gray-200"
            }`}
          >
            <p className="text-base">{msg.message}</p>
            <p className="text-[11px] text-right text-gray-500 flex items-center justify-end gap-1 mt-1">
              {new Date(msg.timestamp || msg.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
              {msg.senderId === currentUserId && tick(msg.status)}
            </p>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="flex border m-4 rounded-xl bg-white px-3 py-2 shadow-sm items-center gap-2">
        <input
          className="flex-grow px-3 py-2 rounded-xl border outline-none bg-gray-100"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        {message && (
          <IoIosSend
            className="text-2xl text-blue-500 cursor-pointer"
            onClick={handleSend}
          />
        )}
        <BsEmojiSmile className="text-xl opacity-70 cursor-pointer mx-1" />
        <HiOutlinePhotograph className="text-xl opacity-70 cursor-pointer" />
      </div>
    </div>
  );
}

export default Details;
