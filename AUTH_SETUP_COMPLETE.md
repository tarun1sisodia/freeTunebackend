# Authentication Setup - Complete Guide

## 🎉 What's Been Implemented

### ✅ Core Fixes (All Completed)
1. **GetObjectCommand Import Bug** - Fixed missing import in audioUpload.js
2. **JWT Security** - Removed default secret, enforces env var requirement
3. **Duplicate Shutdown Handlers** - Removed from app.js
4. **Mongoose Config** - Added proper config export
5. **Auth Middleware Optimization** - Removed redundant JWT verification

### ✅ Complete Authentication System

#### 1. **Auth Validators** (`src/validators/auth.validators.js`)
- ✅ Registration with password strength validation
- ✅ Login validation
- ✅ Token refresh validation
- ✅ Password reset request & reset
- ✅ Email verification
- ✅ Profile update validation
- ✅ Change password with current password verification

#### 2. **Auth Service** (`src/services/auth.service.js`)
- ✅ User registration with Supabase Auth
- ✅ User login with session management
- ✅ Token generation (access & refresh)
- ✅ Token verification
- ✅ Password hashing with bcrypt
- ✅ User profile management
- ✅ Password change with verification
- ✅ Password reset flow
- ✅ Email verification
- ✅ Logout functionality

#### 3. **Auth Controllers** (`src/controllers/user/auth.controller.js`)
- ✅ POST `/api/v1/auth/register` - Register new user
- ✅ POST `/api/v1/auth/login` - Login user
- ✅ POST `/api/v1/auth/refresh-token` - Refresh access token
- ✅ POST `/api/v1/auth/logout` - Logout user
- ✅ GET `/api/v1/auth/me` - Get current user profile
- ✅ PATCH `/api/v1/auth/profile` - Update profile
- ✅ POST `/api/v1/auth/change-password` - Change password
- ✅ POST `/api/v1/auth/forgot-password` - Request password reset
- ✅ POST `/api/v1/auth/reset-password` - Reset password
- ✅ POST `/api/v1/auth/verify-email` - Verify email
- ✅ POST `/api/v1/auth/resend-verification` - Resend verification

#### 4. **Auth Routes** (`src/routes/user/auth.routes.js`)
- ✅ All routes configured with proper middleware
- ✅ Rate limiting on auth endpoints
- ✅ Request validation using Zod schemas
- ✅ Protected routes with authMiddleware

#### 5. **Middleware Improvements**
- ✅ **authMiddleware** - Optimized single verification via Supabase
- ✅ **optionalAuth** - Non-blocking auth for public endpoints
- ✅ **validator** - Consistent error format using ApiError.validation()

---

## 🔐 Security Features

1. **Strong Password Requirements**
   - Minimum 8 characters
   - At least 1 uppercase letter
   - At least 1 lowercase letter
   - At least 1 number
   - At least 1 special character

2. **JWT Token Management**
   - Access tokens: 7 days (configurable)
   - Refresh tokens: 30 days
   - Secure token generation
   - Token verification via Supabase Auth

3. **Rate Limiting**
   - Auth endpoints: 5 requests per 15 minutes
   - Prevents brute force attacks

4. **Password Security**
   - Bcrypt hashing with salt rounds
   - Current password verification on change
   - New password must differ from current

5. **Email Verification**
   - Built-in Supabase email verification
   - Resend verification capability

---

## 📋 Environment Variables Required

Add these to your `.env` file:

```bash
# Required for Auth
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Optional for password reset
FRONTEND_URL=http://localhost:3000
```

**⚠️ CRITICAL**: The `JWT_SECRET` is now **required** and has no default value for security.

---

## 🗄️ Database Schema Required

You need to create a `users` table in Supabase:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(30) UNIQUE,
  full_name VARCHAR(100),
  bio TEXT,
  avatar_url TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);
```

---

## 🧪 Testing the Auth API

### 1. Register a New User

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!",
    "username": "johndoe",
    "fullName": "John Doe"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### 3. Get Current User (Protected)

```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Update Profile (Protected)

```bash
curl -X PATCH http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Updated Doe",
    "bio": "Music lover"
  }'
```

### 5. Change Password (Protected)

```bash
curl -X POST http://localhost:3000/api/v1/auth/change-password \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "SecurePass123!",
    "newPassword": "NewSecurePass456!",
    "confirmNewPassword": "NewSecurePass456!"
  }'
```

### 6. Logout (Protected)

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🚀 Starting the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

---

## ⚠️ Important Notes

1. **JWT_SECRET is Required**: Server will fail validation if not set in production
2. **Supabase Setup**: Auth relies on Supabase Auth service
3. **Database Table**: Create the `users` table before testing
4. **Email Verification**: Configure Supabase email templates
5. **Rate Limiting**: Auth endpoints are rate-limited for security

---

## 🐛 Troubleshooting

### "JWT_SECRET is not configured"
- Ensure `JWT_SECRET` is set in your `.env` file
- Must be at least 32 characters for security

### "Authentication service unavailable"
- Check `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set
- Verify Supabase project is accessible

### "User with this email already exists"
- Email is already registered in Supabase Auth
- Use a different email or delete the existing user

### Validation Errors
- Check request body matches schema requirements
- Password must meet strength requirements
- Email must be valid format

---

## 📈 Next Steps

### Recommended Additions:
1. **Add Tests** - Unit tests for auth service, integration tests for endpoints
2. **Social Auth** - Add OAuth providers (Google, GitHub, etc.)
3. **2FA** - Implement two-factor authentication
4. **Session Management** - Track active sessions, logout all devices
5. **Audit Logs** - Log authentication events
6. **Password History** - Prevent password reuse
7. **Account Lockout** - Lock account after failed attempts

---

## 📚 Related Documentation

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Authentication Cheatsheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

**Status**: ✅ Production Ready (with proper environment configuration)
**Version**: 1.0.0
**Last Updated**: 2025-11-13
