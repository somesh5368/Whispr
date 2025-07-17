import React, { useState, useEffect, useRef } from 'react';
import { IoCheckmark, IoCheckmarkDone, IoCheckmarkDoneSharp } from 'react-icons/io5';
import { IoIosSend } from 'react-icons/io';
import { BsEmojiSmile } from 'react-icons/bs';
import { HiOutlinePhotograph } from 'react-icons/hi';
import { SlCallEnd, SlCamrecorder } from 'react-icons/sl';
import axios from 'axios';
import socket from '../../utils/socket';

function Details({ user }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem('user'));
  const currentUserId = currentUser?._id;

  useEffect(() => {
    if (currentUserId) {
      socket.emit('join', currentUserId); // Rejoin room on refresh
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!user?._id) return;

    socket.emit('join', currentUserId);

    (async () => {
      const { data } = await axios.get(
        `http://localhost:5000/api/messages/${currentUserId}/${user._id}`
      );
      setMessages(data);
    })();
  }, [user]);

  // ✅ ONLY use socket to send message
  const handleSend = () => {
    if (!message.trim()) return;
    const payload = { senderId: currentUserId, receiverId: user._id, message };
    socket.emit('send_message', payload);
    setMessage('');
  };

  // 👂 receive messages (both sender and receiver)
  useEffect(() => {
    const recv = (data) => {
      setMessages((prev) => [...prev, data]);

      if (data.receiverId === currentUserId) {
        socket.emit('message_delivered', {
          messageId: data._id,
          senderId: data.senderId,
        });

        setTimeout(() => {
          socket.emit('message_read', {
            messageId: data._id,
            senderId: data.senderId,
          });
        }, 300);
      }
    };

    socket.on('receive_message', recv);
    return () => socket.off('receive_message', recv);
  }, [user]);

  // ⏫ update status
  useEffect(() => {
    const upd = ({ messageId, status }) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? { ...msg, status } : msg))
      );
    };

    socket.on('update_status', upd);
    return () => socket.off('update_status', upd);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 🟢 tick icon
  const tick = (status) =>
    status === 'sent' ? (
      <IoCheckmark size={14} className="ml-1 text-gray-500 inline" />
    ) : status === 'delivered' ? (
      <IoCheckmarkDone size={14} className="ml-1 text-gray-500 inline" />
    ) : status === 'read' ? (
      <IoCheckmarkDoneSharp size={14} className="ml-1 text-blue-600 inline" />
    ) : null;

  return (
    <div className="w-[70%] h-[480px] border-x-2">
      {/* Header */}
      <div className="flex justify-between items-center border-b p-3">
        <div className="flex items-center gap-3">
          <img
            src={user.img || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png'}
            alt={user.name}
            className="h-10 w-10 rounded-full object-cover"
          />
          <div>
            <p className="font-semibold">{user.name}</p>
            <p className="text-xs text-gray-500">Active recently</p>
          </div>
        </div>
        <div className="flex gap-4 text-xl">
          <SlCallEnd /> <SlCamrecorder />
        </div>
      </div>

      {/* Chat */}
      <div className="p-4 h-[320px] overflow-y-auto">
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`mb-2 p-2 rounded-md max-w-[70%] ${
              msg.senderId === currentUserId ? 'bg-blue-200 ml-auto' : 'bg-gray-200'
            }`}
          >
            <p className="text-sm">{msg.message}</p>
            <p className="text-xs text-right text-gray-600 flex items-center justify-end gap-1">
              {new Date(msg.timestamp || msg.createdAt).toLocaleTimeString()}
              {msg.senderId === currentUserId && tick(msg.status)}
            </p>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="flex border m-3 rounded">
        <input
          className="flex-grow px-3 py-2 outline-none"
          placeholder="Enter message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <div className="flex items-center gap-3 px-3">
          {message && (
            <IoIosSend
              className="text-2xl text-blue-500 cursor-pointer"
              onClick={handleSend}
            />
          )}
          <BsEmojiSmile className="text-xl opacity-60" />
          <HiOutlinePhotograph className="text-xl opacity-60" />
        </div>
      </div>
    </div>
  );
}

export default Details;
