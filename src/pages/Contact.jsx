import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ChatsIcon from '../component/ChatsIcon';
import socket from '../utils/socket';

function Contact({ onSelectContact }) {
  const [contacts, setContacts] = useState([]);
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  })();
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchRecentContacts = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/messages/recent`, {
        headers: { Authorization: `Bearer ${currentUser?.token}` },
      });
      const list = Array.isArray(res.data?.contacts) ? res.data.contacts : [];
      setContacts(list);
    } catch (err) {
      setContacts([]);
      console.error('Failed to load contacts:', err);
    }
  };

  useEffect(() => {
    if (!currentUser?.token) return;
    fetchRecentContacts();
    socket.on('updateRecentContacts', fetchRecentContacts);
    return () => socket.off('updateRecentContacts', fetchRecentContacts);
  }, [currentUser?.token]);

  return (
    <div className="rounded-xl border border-ws-border bg-ws-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-ws-border">
        <h3 className="text-sm font-semibold text-ws-text">Contacts</h3>
        <p className="text-xs text-ws-text-muted mt-0.5">Recent conversations</p>
      </div>
      <div className="max-h-[400px] overflow-y-auto p-2">
        {contacts.map((contact) => (
          <ChatsIcon
            key={contact._id || contact.id}
            img={
              contact.avatar ||
              contact.img ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name || 'U')}&background=4a154b&color=fff`
            }
            name={contact.name}
            title="Say hello 👋"
            onClick={() => onSelectContact(contact)}
          />
        ))}
        {contacts.length === 0 && (
          <div className="py-8 text-center text-sm text-ws-text-muted">
            No recent contacts. Start a chat from the sidebar.
          </div>
        )}
      </div>
    </div>
  );
}

export default Contact;
