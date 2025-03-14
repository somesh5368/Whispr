import React from 'react';
import ChatsIcon from '../ChatsIcon/ChatsIcon';
import img from '../img/img.jpg';
import img2 from '../img/img2.jpg';
import img3 from '../img/img3.jpg';
import img4 from '../img/img4.jpg';
import img5 from '../img/img5.jpg';
import img6 from '../img/img6.jpg';
import img7 from '../img/img7.jpg';

function Contact() {
  return (
    <div className="mt-4 h-[400px] overflow-y-hidden hover:overflow-y-scroll bg-gray-100 rounded-lg p-2 shadow-inner">
      <ChatsIcon img={img} title={"hey everyone"} name={"Aarav Singh"} />
      <ChatsIcon img={img2} title={"I m using this..."} name={"Rameshwar Pathan"} />
      <ChatsIcon img={img3} title={"Always smile"} name={"Shreya"} />
      <ChatsIcon img={img4} title={"hey everyone"} name={"Shivani"} />
      <ChatsIcon img={img5} title={"hey everyone"} name={"Jagdish Dubey"} />
      <ChatsIcon img={img6} title={"hey everyone"} name={"Aarati Singh"} />
      <ChatsIcon img={img7} title={"Good vibes only"} name={"Rahul Sharma"} />
    </div>
  );
}

export default Contact;
