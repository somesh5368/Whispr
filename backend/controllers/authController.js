// backend/controllers/authController.js
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cloudinary = require("../config/cloudinary");

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// @POST /api/auth/register
// Register a new user
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password",
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email",
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "Email already registered. Please try another email.",
      });
    }

    // Create new user (password hashing handled in User model)
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
    });

    // Generate JWT token
    const token = generateToken(user._id);

    // Return success response
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar || null,
          bio: user.bio || "",
          phone: user.phone || "",
        },
        token,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: process.env.NODE_ENV === "development" ? error.message : null,
    });
  }
};

// @POST /api/auth/login
// Login user
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // Find user by email
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check password
    const isPasswordValid = await user.matchPassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Return success
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar || null,
          bio: user.bio || "",
          phone: user.phone || "",
        },
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: process.env.NODE_ENV === "development" ? error.message : null,
    });
  }
};

// @GET /api/auth/me
// Get current logged-in user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar || null,
          bio: user.bio || "",
          phone: user.phone || "",
        },
      },
    });
  } catch (error) {
    console.error("getMe error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: process.env.NODE_ENV === "development" ? error.message : null,
    });
  }
};

// @PUT /api/auth/profile
// Update user profile (name, bio, phone)
exports.updateProfile = async (req, res) => {
  try {
    const { name, bio, phone } = req.body;
    const userId = req.user.id;

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update fields if provided
    if (name) user.name = name.trim();
    if (bio !== undefined) user.bio = bio;
    if (phone) user.phone = phone;

    // Save user
    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar || null,
          bio: user.bio || "",
          phone: user.phone || "",
        },
      },
    });
  } catch (error) {
    console.error("updateProfile error:", error);
    res.status(500).json({
      success: false,
      message: "Profile update failed",
      error: process.env.NODE_ENV === "development" ? error.message : null,
    });
  }
};

// @PUT /api/auth/profile-photo
// Upload profile photo
exports.updateProfilePhoto = async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file provided. Please upload an image.",
      });
    }

    // Find user
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Validate file size (max 5MB)
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "File size must be less than 5MB",
      });
    }

    // Validate file type
    const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedMimes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Only image files are allowed (JPEG, PNG, GIF, WebP)",
      });
    }

    // Delete old avatar from Cloudinary if exists
    if (user.avatar && user.avatar.includes("cloudinary")) {
      try {
        const publicId = user.avatar.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`whispr/avatars/${publicId}`);
      } catch (err) {
        console.warn("Could not delete old avatar:", err.message);
      }
    }

    // Upload to Cloudinary
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "whispr/avatars",
          width: 300,
          height: 300,
          crop: "fill",
          resource_type: "auto",
        },
        async (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            return res.status(500).json({
              success: false,
              message: "Image upload failed",
              error: error.message,
            });
          }

          // Update user with new avatar
          user.avatar = result.secure_url;
          await user.save();

          res.status(200).json({
            success: true,
            message: "Profile photo updated successfully",
            data: {
              user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                bio: user.bio || "",
                phone: user.phone || "",
              },
              imageUrl: result.secure_url,
            },
          });

          resolve();
        }
      );

      uploadStream.end(req.file.buffer);
    });
  } catch (error) {
    console.error("updateProfilePhoto error:", error);
    res.status(500).json({
      success: false,
      message: "Profile photo update failed",
      error: process.env.NODE_ENV === "development" ? error.message : null,
    });
  }
};

// @GET /api/auth/search?q=query
// Search users
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user?.id;

    if (!q || !q.trim()) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    // Create case-insensitive regex
    const regex = new RegExp(q.trim(), "i");

    // Search query
    const query = {
      $or: [{ name: regex }, { email: regex }],
    };

    // Exclude current user
    if (currentUserId) {
      query._id = { $ne: currentUserId };
    }

    // Find users
    const users = await User.find(query)
      .select("_id name email avatar bio")
      .limit(10);

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("searchUsers error:", error);
    res.status(500).json({
      success: false,
      message: "Search failed",
      error: process.env.NODE_ENV === "development" ? error.message : null,
    });
  }
};

// @GET /api/auth/users/:userId
// Get all users except given user
exports.getAllUsers = async (req, res) => {
  try {
    const { userId } = req.params;

    const users = await User.find({ _id: { $ne: userId } })
      .select("_id name email avatar bio")
      .limit(50);

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("getAllUsers error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: process.env.NODE_ENV === "development" ? error.message : null,
    });
  }
};
