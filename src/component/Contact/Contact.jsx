import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ChatsIcon from '../ChatsIcon/ChatsIcon';
import socket from "../../utils/socket";

function Contact({ onSelectContact }) {
  const [contacts, setContacts] = useState([]);
  const currentUser = JSON.parse(localStorage.getItem('user'));

  const fetchRecentContacts = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/messages/recent-contacts`,
        { headers: { Authorization: `Bearer ${currentUser.token}` } }
      );
      setContacts(res.data);
    } catch (err) {
      setContacts([]);
      console.error("Failed to load contacts:", err);
    }
  };

  useEffect(() => {
    fetchRecentContacts();
    socket.on('updateRecentContacts', fetchRecentContacts);
    return () => socket.off('updateRecentContacts', fetchRecentContacts);
  }, [currentUser.token]);

  return (
    <div className="h-[400px] overflow-y-scroll scrollbar-hide bg-gray-100 rounded-lg p-2 shadow-inner">
      {contacts.map((contact) => (
        <ChatsIcon
          key={contact._id}
          img={contact.img || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}
          name={contact.name}
          title="Say hello 👋"
          onClick={() => onSelectContact(contact)}
        />
      ))}
    </div>
  );
}
export default Contact;
