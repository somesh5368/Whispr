const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cloudinary = require("../config/cloudinary");

// ============================================
// Generate JWT Token
// ============================================
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// ============================================
// POST: Register User
// ============================================
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Please provide all required fields",
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (userExists) {
      return res.status(400).json({
        message: "User already exists with that email",
      });
    }

    // Create user (password hashing handled in model pre-save hook)
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
    });

    // Generate token
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
    console.error("❌ Register error:", error);
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

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Please provide email and password",
      });
    }

    // Check for user
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // Check password
    const isPasswordValid = await user.matchPassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // Generate token
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
    console.error("❌ Login error:", error);
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
    const user = await User.findById(req.user.id);

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
    console.error("❌ getMe error:", error);
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
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Update fields if provided
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
    console.error("❌ updateProfile error:", error);
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
    if (!req.file) {
      return res.status(400).json({
        message: "No file provided",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Upload to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "whispr/avatars",
        transformation: [
          { width: 300, height: 300, crop: "fill" },
        ],
      },
      async (error, result) => {
        if (error) {
          console.error("❌ Cloudinary upload error:", error);
          return res.status(500).json({
            message: "Upload failed",
            error: error.message,
          });
        }

        // Update user avatar
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

    uploadStream.end(req.file.buffer);
  } catch (error) {
    console.error("❌ updateProfilePhoto error:", error);
    res.status(500).json({
      message: "Profile photo update failed",
      error: error.message,
    });
  }
};

// ============================================
// GET: Search Users
// ============================================
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        message: "Search query is required",
      });
    }

    const users = await User.find(
      {
        $or: [
          { name: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
        ],
      },
      { password: 0 }
    ).limit(10);

    res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("❌ searchUsers error:", error);
    res.status(500).json({
      message: "Search failed",
      error: error.message,
    });
  }
};

// ============================================
// GET: Get All Users
// ============================================
exports.getAllUsers = async (req, res) => {
  try {
    const { userId } = req.params;

    const users = await User.find(
      { _id: { $ne: userId } },
      { password: 0 }
    );

    res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("❌ getAllUsers error:", error);
    res.status(500).json({
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};
