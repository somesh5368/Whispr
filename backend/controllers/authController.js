// backend/controllers/authController.js
const crypto = require("crypto");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const { cloudinary } = require("../config/cloudinary");
const asyncHandler = require("../utils/asyncHandler");

// Generate JWT Token with configurable expiry (default "7d" per Task 7)
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// @POST /api/auth/register
// Register a new user
exports.registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Please provide name, email, and password",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters",
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

  // Create new user (password hashing handled in User model with bcrypt cost 12)
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
  });

  const token = generateToken(user._id);

  return res.status(201).json({
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
});

// @POST /api/auth/login
// Login user (returns identical generic error for wrong email and wrong password per Task 7)
exports.loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

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

  // Constant-time comparison check; returns same generic error for unknown email or wrong password
  const isMatch = user ? await user.matchPassword(password) : false;
  if (!user || !isMatch) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }

  // Generate token
  const token = generateToken(user._id);

  return res.status(200).json({
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
});

// @GET /api/auth/me
// Get current logged-in user (only frontend-needed fields)
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  return res.status(200).json({
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
});

// @PUT /api/auth/profile
// Update user profile (name, bio, phone)
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, bio, phone } = req.body;
  const userId = req.user.id;

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (name) user.name = name.trim();
  if (bio !== undefined) user.bio = bio;
  if (phone !== undefined) user.phone = phone;

  await user.save();

  return res.status(200).json({
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
});

// @PUT /api/auth/profile-photo
// Upload profile photo
exports.updateProfilePhoto = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file provided. Please upload an image.",
    });
  }

  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Delete old avatar from Cloudinary if exists
  if (user.avatar && user.avatar.includes("cloudinary")) {
    try {
      const matches = user.avatar.match(/whispr\/avatars\/[^.]+/);
      const publicId = matches
        ? matches[0]
        : `whispr/avatars/${user.avatar.split("/").pop().split(".")[0]}`;
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.warn("Could not delete old avatar:", err.message);
    }
  }

  // Generate unique server-controlled public ID (Task 6)
  const uniquePublicId = `avatar_${crypto.randomUUID()}`;

  // Upload to Cloudinary via stream
  return new Promise((resolve) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "whispr/avatars",
        public_id: uniquePublicId,
        width: 300,
        height: 300,
        crop: "fill",
        resource_type: "auto",
      },
      async (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          next(error);
          return resolve();
        }

        try {
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
        } catch (saveErr) {
          next(saveErr);
          resolve();
        }
      }
    );

    uploadStream.end(req.file.buffer);
  });
});

// @GET /api/auth/search?q=query
// Search users: anchored prefix match, collation strength 2, limit 10, exclude current user (Task 8)
exports.searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const currentUserId = req.user?.id;

  if (!q || q.trim().length < 2) {
    return res.status(200).json({
      success: true,
      data: [],
    });
  }

  // Escape regex special characters to prevent ReDoS attacks
  const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Anchored prefix match (Task 8)
  const regex = new RegExp(`^${escaped}`, "i");

  const query = {
    $or: [{ name: regex }, { email: regex }],
  };

  // Exclude current user
  if (currentUserId) {
    query._id = { $ne: currentUserId };
  }

  // Find users using collation strength 2
  const users = await User.find(query)
    .collation({ locale: "en", strength: 2 })
    .select("_id name email avatar bio")
    .limit(10);

  return res.status(200).json({
    success: true,
    data: users,
  });
});

// @GET /api/auth/users/:userId
// Get all users except given user
exports.getAllUsers = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const users = await User.find({ _id: { $ne: userId } })
    .select("_id name email avatar bio")
    .limit(50);

  return res.status(200).json({
    success: true,
    data: users,
  });
});
