import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/register",
        {
          name,
          email,
          password,
        }
      );

      // Save user data in localStorage
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user)); // Save user info

      setSuccess("🎉 Registration successful!");
      setError("");
      setTimeout(() => {
        navigate("/main"); // Registration ke baad main page par redirect karega
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "❌ Something went wrong");
      setSuccess("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-8 rounded-lg bg-gradient-to-br from-white to-blue-50 shadow-lg font-sans text-center">
      <h2 className="text-2xl text-gray-800 mb-5">Create Your Chat Account</h2>
      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
      {success && <p className="text-green-500 text-sm mb-2">{success}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="text-left">
          <label className="font-semibold text-gray-700">Name</label>
          <input
            type="text"
            className="w-full p-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Enter your name"
          />
        </div>

        <div className="text-left">
          <label className="font-semibold text-gray-700">Email</label>
          <input
            type="email"
            className="w-full p-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
          />
        </div>

        <div className="text-left">
          <label className="font-semibold text-gray-700">Password</label>
          <input
            type="password"
            className="w-full p-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter a password"
          />
        </div>

        <button
          type="submit"
          className="bg-blue-500 text-white py-3 px-6 font-semibold rounded-lg cursor-pointer transition duration-300 ease-in-out hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
          disabled={loading}
        >
          {loading ? (
            <div className="w-6 h-6 border-4 border-t-transparent border-white rounded-full animate-spin"></div>
          ) : (
            "Register"
          )}
        </button>
      </form>
    </div>
  );
};

export default Register;
