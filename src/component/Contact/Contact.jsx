import React from 'react';
import ChatsIcon from '../ChatsIcon/ChatsIcon';
import img from '../img/img.jpg';
import img2 from '../img/img2.jpg';
import img3 from '../img/img3.jpg';
import img4 from '../img/img4.jpg';
import img5 from '../img/img5.jpg';
import img6 from '../img/img6.jpg';
import img7 from '../img/img7.jpg';

function Contact({ onSelectContact }) {
    // Centralized data array for contacts
    const contacts = [
        { img: img, name: "Aarav Singh", title: "hey everyone" },
        { img: img2, name: "Rameshwar Pathan", title: "I m using this..." },
        { img: img3, name: "Shreya", title: "Always smile" },
        { img: img4, name: "Shivani", title: "hey everyone" },
        { img: img5, name: "Jagdish Dubey", title: "hey everyone" },
        { img: img6, name: "Aarati Singh", title: "hey everyone" },
        { img: img7, name: "Rahul Sharma", title: "Good vibes only" },
    ];

    return (
        <div className="mt-4  h-[400px] overflow-y-hidden hover:overflow-y-scroll bg-gray-100 rounded-lg p-2 shadow-inner">
            {/* Dynamically render ChatsIcon components */}
            {contacts.map((contact, index) => (
                <ChatsIcon
                    key={index}
                    img={contact.img}
                    name={contact.name}
                    title={contact.title}
                    onClick={() => onSelectContact && onSelectContact(contact)}
                />
            ))}
        </div>
    );
}

export default Contact;