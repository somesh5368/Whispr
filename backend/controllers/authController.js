// controllers/authController.js
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cloudinary = require("../config/cloudinary");

// ============================================
// Generate JWT Token
// ============================================
const generateToken = (id) => {
  // Sign JWT with user id as payload
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d", // token valid for 30 days
  });
};

// ============================================
// POST: Register User
// ============================================
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Please provide all required fields",
      });
    }

    // Check if email already exists
    const userExists = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (userExists) {
      return res.status(400).json({
        message: "User already exists with that email",
      });
    }

    // Create user (password hash handled in User model)
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
    });

    // Create JWT token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        phone: user.phone,
      },
      token,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      message: "Registration failed",
      error: error.message,
    });
  }
};

// ============================================
// POST: Login User
// ============================================
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        message: "Please provide email and password",
      });
    }

    // Find user by email
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // Validate password using model helper
    const isPasswordValid = await user.matchPassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // Create JWT token
    const token = generateToken(user._id);

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        phone: user.phone,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
};

// ============================================
// GET: Get Current User
// ============================================
exports.getMe = async (req, res) => {
  try {
    // user id comes from auth middleware
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("getMe error:", error);
    res.status(500).json({
      message: "Failed to fetch user",
      error: error.message,
    });
  }
};

// ============================================
// PUT: Update User Profile
// ============================================
exports.updateProfile = async (req, res) => {
  try {
    const { name, bio, phone } = req.body;

    // Find current user
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Update only provided fields
    if (name) user.name = name.trim();
    if (bio !== undefined) user.bio = bio;
    if (phone) user.phone = phone;

    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("updateProfile error:", error);
    res.status(500).json({
      message: "Profile update failed",
      error: error.message,
    });
  }
};

// ============================================
// PUT: Update Profile Photo
// ============================================
exports.updateProfilePhoto = async (req, res) => {
  try {
    // Check if file is attached
    if (!req.file) {
      return res.status(400).json({
        message: "No file provided",
      });
    }

    // Find user
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Upload image buffer to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "whispr/avatars",
        transformation: [{ width: 300, height: 300, crop: "fill" }],
      },
      async (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return res.status(500).json({
            message: "Upload failed",
            error: error.message,
          });
        }

        // Save new avatar URL
        user.avatar = result.secure_url;
        await user.save();

        res.json({
          success: true,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            bio: user.bio,
            phone: user.phone,
          },
        });
      }
    );

    // Send file buffer into upload stream
    uploadStream.end(req.file.buffer);
  } catch (error) {
    console.error("updateProfilePhoto error:", error);
    res.status(500).json({
      message: "Profile photo update failed",
      error: error.message,
    });
  }
};

// ============================================
// GET: Search Users (for global search)
// ============================================
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user?.id; // may exist from protect middleware

    // If no query string -> return empty
    if (!q || !q.trim()) {
      return res.json([]);
    }

    const regex = new RegExp(q.trim(), "i"); // case-insensitive

    const query = {
      $or: [
        { name: { $regex: regex } },
        { email: { $regex: regex } },
      ],
    };

    // Exclude current user if available
    if (currentUserId) {
      query._id = { $ne: currentUserId };
    }

    const users = await User.find(query, { password: 0 }) // exclude password
      .limit(10); // limit for performance

    res.json(users);
  } catch (error) {
    console.error("searchUsers error:", error);
    res.status(500).json({
      message: "Search failed",
      error: error.message,
    });
  }
};

// ============================================
// GET: Get All Users (except given userId)
// ============================================
exports.getAllUsers = async (req, res) => {
  try {
    const { userId } = req.params;

    const users = await User.find(
      { _id: { $ne: userId } }, // exclude this user
      { password: 0 } // hide password
    );

    res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("getAllUsers error:", error);
    res.status(500).json({
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};
