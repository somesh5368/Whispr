import React, { useState, useEffect } from "react";
import axios from "axios";

const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/3177/3177440.png";
const DEFAULT_BIO = "Hey there! I am using Whispr.";

const Profile = ({ onClose }) => {
  const token = JSON.parse(localStorage.getItem("user"))?.token;
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: "", img: "", bio: "", phone: "" });
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        setProfile(res.data);
        setForm({
          name: res.data.name || "",
          img: res.data.img  || "",
          bio: res.data.bio  || "",
          phone: res.data.phone || "",
        });
      })
      .catch(() => setProfile(false)); // Handle error + stop loader!
  }, [token]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async () => {
    try {
      const { name, img, bio, phone } = form;
      const res = await axios.put(
        "http://localhost:5000/api/users/profile",
        { name, img, bio, phone },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProfile(res.data);
      setEditMode(false);
    } catch {
      alert("Profile update failed");
    }
  };

  // ERROR/FALLBACK UI
  if (profile === false) return (
    <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[350px] text-center">
        <div className="text-red-500 mb-2">Failed to load profile</div>
        <button className="mt-3 px-4 py-2 rounded bg-gray-300" onClick={onClose}>Close</button>
      </div>
    </div>
  );

  // Loader UI
  if (!profile) return (
    <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[350px] text-center">
        Loading...
        <button className="mt-3 px-4 py-2 rounded bg-gray-300" onClick={onClose}>Close</button>
      </div>
    </div>
  );

  const avatar = form.img?.trim() ? form.img : DEFAULT_AVATAR;
  const bio = form.bio?.trim() ? form.bio : DEFAULT_BIO;

  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="relative bg-white p-6 rounded-lg shadow-xl w-[350px]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-4 text-lg font-bold"
          title="Close"
        >×</button>

        {/* Avatar */}
        <img
          src={avatar}
          alt="avatar"
          className="h-20 w-20 mx-auto rounded-full border mb-2 object-cover"
        />

        {editMode ? (
          <div className="flex flex-col gap-2">
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Name"
              className="px-2 py-1 border rounded"
            />
            <input
              name="img"
              value={form.img}
              onChange={handleChange}
              placeholder="Image URL"
              className="px-2 py-1 border rounded"
            />
            <input
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder="Bio"
              className="px-2 py-1 border rounded"
            />
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Phone"
              className="px-2 py-1 border rounded"
            />
            <button
              onClick={handleSave}
              className="bg-blue-500 text-white py-1 rounded mt-2"
            >Save</button>
            <button
              className="mt-1 px-2 py-1 text-xs bg-gray-200 rounded"
              onClick={() => setEditMode(false)}
            >Cancel</button>
          </div>
        ) : (
          <div className="text-center">
            <h2 className="font-bold text-lg">{profile.name}</h2>
            <p className="text-sm text-gray-500">{profile.email}</p>
            {profile.phone && <p className="text-sm">{profile.phone}</p>}
            <p className="text-xs text-gray-600">{bio}</p>
            <button
              onClick={() => setEditMode(true)}
              className="bg-blue-400 text-white px-4 py-1 rounded mt-2"
            >Edit Profile</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
