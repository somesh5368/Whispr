const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  img:      { type: String, default: "https://cdn-icons-png.flaticon.com/512/3177/3177440.png" },
  bio:      { type: String, default: "" },
  phone:    { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
