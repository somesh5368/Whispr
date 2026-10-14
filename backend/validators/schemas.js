// backend/validators/schemas.js
const { z } = require("zod");

// Strict 24-hex-character MongoDB ObjectId schema
const objectIdSchema = z
  .string({
    required_error: "ID parameter is required",
    invalid_type_error: "ID must be a string",
  })
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId format");

// Common Param Schemas
const userIdParamSchema = z
  .object({
    userId: objectIdSchema,
  })
  .strict();

const messageIdParamSchema = z
  .object({
    messageId: objectIdSchema,
  })
  .strict();

// ============================================
// Auth & User Schemas
// ============================================

// Register: name (2-50), email, password (min 8, max 72 bytes for bcrypt)
const registerSchema = z
  .object({
    name: z
      .string({
        required_error: "Name is required",
        invalid_type_error: "Name must be a string",
      })
      .trim()
      .min(2, "Name must be between 2 and 50 characters")
      .max(50, "Name must be between 2 and 50 characters"),
    email: z
      .string({
        required_error: "Email is required",
        invalid_type_error: "Email must be a string",
      })
      .trim()
      .toLowerCase()
      .email("Please provide a valid email address")
      .max(100, "Email cannot exceed 100 characters"),
    password: z
      .string({
        required_error: "Password is required",
        invalid_type_error: "Password must be a string",
      })
      .min(8, "Password must be at least 8 characters")
      .refine(
        (val) => Buffer.byteLength(val, "utf8") <= 72,
        "Password cannot exceed 72 bytes"
      ),
    confirmPassword: z.string().optional(),
  })
  .strict();

// Login: email, password
const loginSchema = z
  .object({
    email: z
      .string({
        required_error: "Email is required",
        invalid_type_error: "Email must be a string",
      })
      .trim()
      .toLowerCase()
      .email("Please provide a valid email address"),
    password: z
      .string({
        required_error: "Password is required",
        invalid_type_error: "Password must be a string",
      })
      .min(1, "Password is required"),
  })
  .strict();

// Profile Update: name, bio, phone
const updateProfileSchema = z
  .object({
    name: z
      .string({ invalid_type_error: "Name must be a string" })
      .trim()
      .min(2, "Name must be between 2 and 50 characters")
      .max(50, "Name must be between 2 and 50 characters")
      .optional(),
    bio: z
      .string({ invalid_type_error: "Bio must be a string" })
      .max(500, "Bio cannot exceed 500 characters")
      .optional(),
    phone: z
      .string({ invalid_type_error: "Phone must be a string" })
      .trim()
      .regex(/^(\+\d{1,3}[- ]?)?\d{10}$/, "Please provide a valid 10-digit phone number")
      .optional()
      .or(z.literal("")),
  })
  .strict();

// User Search Query: q (min 2, max 50)
const searchQuerySchema = z
  .object({
    q: z
      .string({
        required_error: "Search query 'q' is required",
        invalid_type_error: "Search query must be a string",
      })
      .trim()
      .min(2, "Search query must be between 2 and 50 characters")
      .max(50, "Search query must be between 2 and 50 characters"),
  })
  .strict();

// ============================================
// Message Schemas
// ============================================

// Send Message: receiverId, message, image
const sendMessageSchema = z
  .object({
    receiverId: objectIdSchema,
    message: z
      .string({ invalid_type_error: "Message must be a string" })
      .max(2000, "Message cannot exceed 2000 characters")
      .optional()
      .or(z.literal("")),
    image: z
      .string({ invalid_type_error: "Image URL must be a string" })
      .url("Invalid image URL")
      .refine(
        (val) => val.includes("res.cloudinary.com"),
        "Image must be hosted on Cloudinary"
      )
      .optional()
      .nullable(),
  })
  .strict()
  .refine(
    (data) => (data.message && data.message.trim().length > 0) || Boolean(data.image),
    {
      message: "Receiver ID and message or image are required",
      path: ["message"],
    }
  );

// Upload Image Body: receiverId
const uploadImageBodySchema = z
  .object({
    receiverId: objectIdSchema,
  })
  .strict();

// Edit Message: message
const editMessageSchema = z
  .object({
    message: z
      .string({
        required_error: "Message is required",
        invalid_type_error: "Message must be a string",
      })
      .trim()
      .min(1, "Message text cannot be empty")
      .max(2000, "Message exceeds maximum length of 2000 characters"),
  })
  .strict();

// Update Message Status: status
const updateMessageStatusSchema = z
  .object({
    status: z.enum(["sent", "delivered", "read"], {
      errorMap: () => ({ message: "Status must be 'sent', 'delivered', or 'read'" }),
    }),
  })
  .strict();

// Get Messages Query Schema
const getMessagesQuerySchema = z
  .object({
    limit: z
      .string()
      .regex(/^\d+$/, "Limit must be a positive integer")
      .optional(),
    before: z.string().datetime({ message: "Before cursor must be a valid ISO datetime string" }).optional(),
  })
  .strict();

module.exports = {
  objectIdSchema,
  userIdParamSchema,
  messageIdParamSchema,
  registerSchema,
  loginSchema,
  updateProfileSchema,
  searchQuerySchema,
  sendMessageSchema,
  uploadImageBodySchema,
  editMessageSchema,
  updateMessageStatusSchema,
  getMessagesQuerySchema,
};
