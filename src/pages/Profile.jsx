// src/pages/Profile.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";

const DEFAULT_AVATAR =
  "https://cdn-icons-png.flaticon.com/512/3177/3177440.png";
const DEFAULT_BIO = "Hey there! I am using Whispr.";

// API base (use env, fallback localhost)
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Profile = ({ onClose }) => {
  const token = JSON.parse(localStorage.getItem("user"))?.token;

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: "",
    bio: "",
    phone: "",
    img: "",
  });
  const [editMode, setEditMode] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!token) return;

    axios
      .get(`${API_BASE}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setProfile(res.data);
        setForm({
          name: res.data.name || "",
          img: res.data.img || "",
          bio: res.data.bio || "",
          phone: res.data.phone || "",
        });
      })
      .catch(() => setProfile(false));
  }, [token]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async () => {
    try {
      const { name, bio, phone } = form;
      const res = await axios.put(
        `${API_BASE}/api/users/profile`,
        { name, bio, phone },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProfile(res.data);
      setForm((prev) => ({
        ...prev,
        name: res.data.name || "",
        bio: res.data.bio || "",
        phone: res.data.phone || "",
        img: res.data.img || prev.img,
      }));
      setEditMode(false);
    } catch {
      alert("Profile update failed");
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null);
  };

  const handlePhotoUpload = async () => {
    if (!file) return;
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await axios.put(
        `${API_BASE}/api/users/profile/photo`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setProfile(res.data);
      setForm((prev) => ({
        ...prev,
        img: res.data.img || prev.img,
      }));
      setFile(null);
    } catch (err) {
      console.error(
        "Photo upload error:",
        err.response?.data || err.message
      );
      alert("Photo upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (profile === false) {
    return (
      <div className="p-4 text-sm text-red-500">
        Failed to load profile. Please try again.
      </div>
    );
  }

  const avatar = form.img || DEFAULT_AVATAR;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-3">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-800">Profile</h2>
          <button
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Avatar + upload */}
          <div className="flex flex-col items-center gap-3">
            <img
              src={avatar}
              alt="Avatar"
              className="w-20 h-20 rounded-full object-cover border border-gray-200"
            />
            <div className="flex flex-wrap items-center justify-center gap-2">
              <label className="text-xs px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-full cursor-pointer hover:bg-gray-200">
                Choose photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              <button
                onClick={handlePhotoUpload}
                disabled={!file || uploading}
                className="text-xs px-3 py-1.5 bg-emerald-500 text-white rounded-full disabled:opacity-60"
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>

          {/* Info form */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Name
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                disabled={!editMode}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                About
              </label>
              <textarea
                name="bio"
                value={form.bio || DEFAULT_BIO}
                onChange={handleChange}
                disabled={!editMode}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Phone
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                disabled={!editMode}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-50"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              {!editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="text-xs px-3 py-1.5 border border-gray-300 rounded-full hover:bg-gray-100"
                >
                  Edit
                </button>
              )}
              {editMode && (
                <>
                  <button
                    onClick={() => {
                      setEditMode(false);
                      setForm({
                        name: profile.name || "",
                        img: profile.img || "",
                        bio: profile.bio || "",
                        phone: profile.phone || "",
                      });
                    }}
                    className="text-xs px-3 py-1.5 border border-gray-300 rounded-full hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="text-xs px-3 py-1.5 bg-emerald-500 text-white rounded-full hover:bg-emerald-600"
                  >
                    Save
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
