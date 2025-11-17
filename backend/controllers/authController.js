const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// Register User
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields required" });

    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });

    const token = generateToken(user._id);
    res.status(201).json({
      user: { 
        _id: user._id, 
        name: user.name, 
        email: user.email, 
        img: user.img, 
        bio: user.bio, 
        phone: user.phone 
      }, 
      token
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
};

// Login User
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email or password missing" });

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(user._id);
    res.json({ 
      user: { 
        _id: user._id, 
        name: user.name, 
        email: user.email, 
        img: user.img, 
        bio: user.bio, 
        phone: user.phone 
      }, 
      token 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};

// Get current logged-in user profile
exports.getMe = async (req, res) => {
  try {
    console.log('REQ.USER at getMe:', req.user);
    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }
    res.json(req.user);
  } catch (err) {
    console.error('GetMe error:', err);
    res.status(500).json({ message: "GetMe failed", error: err.message });
  }
};

// Update current logged-in user profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, img, bio, phone } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(401).json({ message: "User not found" });
    if (name)  user.name = name;
    if (img)   user.img  = img;
    if (bio)   user.bio  = bio;
    if (phone) user.phone= phone;
    await user.save();
    res.json(user);
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ message: "Profile update failed", error: err.message });
  }
};

// Search users
exports.searchUsers = async (req, res) => {
  const searchQuery = req.query.q;
  if (!searchQuery)
    return res.status(400).json({ message: "Search query is required" });

  try {
    const users = await User.find({
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } }
      ]
    }).select('-password');
    res.status(200).json(users);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ message: 'Search failed', error: err.message });
  }
};

// Get all users except current user
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.params.userId } }).select('-password');
    res.json(users);
  } catch (err) {
    console.error('GetAllUsers error:', err);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};
