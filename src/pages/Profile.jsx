import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DEFAULT_AVATAR =
  'https://cdn-icons-png.flaticon.com/512/3177/3177440.png';
const DEFAULT_BIO = "Hey there! I am using Whispr.";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Profile = ({ onClose }) => {
  const token = JSON.parse(localStorage.getItem('user'))?.token;
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: '',
    bio: '',
    phone: '',
    img: '',
  });
  const [editMode, setEditMode] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    if (!token) return;
    axios
      .get(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const user = res.data?.data?.user || res.data.user || res.data;
        setProfile(user);
        setForm({
          name: user.name || '',
          img: user.avatar || '',
          bio: user.bio || '',
          phone: user.phone || '',
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
        `${API_BASE}/api/auth/profile`,
        { name, bio, phone },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const user = res.data?.data?.user || res.data.user || res.data;
      setProfile(user);
      setForm((prev) => ({
        ...prev,
        name: user.name || '',
        bio: user.bio || '',
        phone: user.phone || '',
        img: user.avatar || prev.img,
      }));
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        localStorage.setItem('user', JSON.stringify({
          ...parsed,
          user: {
            ...(parsed.user || {}),
            id: user.id || user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            bio: user.bio,
            phone: user.phone,
          },
        }));
      }
      setEditMode(false);
    } catch {
      alert('Profile update failed');
    }
  };

  const handleFileChange = (e) => setFile(e.target.files[0] || null);

  const handlePhotoUpload = async () => {
    if (!file) return;
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await axios.put(
        `${API_BASE}/api/auth/profile-photo`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const user = res.data?.data?.user || res.data.user || res.data;
      setProfile(user);
      setForm((prev) => ({ ...prev, img: user.avatar || prev.img }));
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        localStorage.setItem('user', JSON.stringify({
          ...parsed,
          user: {
            ...(parsed.user || {}),
            id: user.id || user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            bio: user.bio,
            phone: user.phone,
          },
        }));
      }
    } catch (err) {
      console.error('Photo upload error:', err?.response?.data || err.message);
      alert('Photo upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (profile === false) {
    return (
      <div className="p-6 text-sm text-red-600">
        Failed to load profile. Please try again.
      </div>
    );
  }

  const avatar = form.img || DEFAULT_AVATAR;

  return (
    <div className="p-6 overflow-y-auto">
      <div className="flex flex-col items-center gap-4 mb-6">
        <img
          src={avatar}
          alt="Avatar"
          className="w-24 h-24 rounded-full object-cover border-4 border-ws-border"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = DEFAULT_AVATAR;
          }}
        />
        <div className="flex flex-wrap items-center justify-center gap-2">
          <label className="text-sm px-4 py-2 bg-ws-surface-alt border border-ws-border rounded-lg cursor-pointer hover:bg-ws-border/30 transition font-medium text-ws-text">
            Choose photo
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
          <button
            onClick={handlePhotoUpload}
            disabled={!file || uploading}
            className="text-sm px-4 py-2 bg-ws-primary text-white rounded-lg hover:bg-ws-primary-hover disabled:opacity-60 font-medium transition"
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ws-text mb-1.5">Name</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            disabled={!editMode}
            className="w-full px-4 py-2.5 text-sm border border-ws-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ws-primary/20 focus:border-ws-primary disabled:bg-ws-surface-alt disabled:text-ws-text-muted transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ws-text mb-1.5">About</label>
          <textarea
            name="bio"
            value={form.bio || DEFAULT_BIO}
            onChange={handleChange}
            disabled={!editMode}
            rows={3}
            className="w-full px-4 py-2.5 text-sm border border-ws-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ws-primary/20 focus:border-ws-primary disabled:bg-ws-surface-alt disabled:text-ws-text-muted transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ws-text mb-1.5">Phone</label>
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            disabled={!editMode}
            className="w-full px-4 py-2.5 text-sm border border-ws-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ws-primary/20 focus:border-ws-primary disabled:bg-ws-surface-alt disabled:text-ws-text-muted transition"
          />
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="text-sm px-4 py-2 border border-ws-border rounded-lg hover:bg-ws-surface-alt text-ws-text font-medium transition"
            >
              Edit profile
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setEditMode(false);
                  setForm({
                    name: profile.name || '',
                    img: profile.avatar || '',
                    bio: profile.bio || '',
                    phone: profile.phone || '',
                  });
                }}
                className="text-sm px-4 py-2 border border-ws-border rounded-lg hover:bg-ws-surface-alt text-ws-text font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="text-sm px-4 py-2 bg-ws-primary text-white rounded-lg hover:bg-ws-primary-hover font-medium transition"
              >
                Save
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
