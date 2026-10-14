// backend/routes/authRoutes.js

const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  getMe,
  searchUsers,
  getAllUsers,
  updateProfile,
  updateProfilePhoto,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  validate,
  registerSchema,
  loginSchema,
  updateProfileSchema,
  searchQuerySchema,
  userIdParamSchema,
} = require("../validators");
const { authLimiter, searchLimiter, uploadLimiter } = require("../config/rateLimiters");

// Authentication routes (rate limited & validated)
router.post("/register", authLimiter, validate({ body: registerSchema }), registerUser);
router.post("/login", authLimiter, validate({ body: loginSchema }), loginUser);

// Legacy aliases (canonical routes are under /api/users)
router.get("/me", protect, getMe);
router.put("/profile", protect, validate({ body: updateProfileSchema }), updateProfile);
router.put("/profile-photo", protect, uploadLimiter, upload.single("avatar"), updateProfilePhoto);
router.get("/search", protect, searchLimiter, validate({ query: searchQuerySchema }), searchUsers);
router.get("/users/:userId", protect, validate({ params: userIdParamSchema }), getAllUsers);

module.exports = router;
