# Authentication Setup Guide

## ✅ What's Been Implemented

Your POS system now has a complete authentication system with the following features:

### 🔐 Authentication Features
- **Login Page** - Beautiful, responsive login form at `/login`
- **Signup Page** - User registration with password validation at `/signup`
- **NextAuth v5** - Industry-standard authentication library
- **Password Security** - Bcrypt hashing with 10 salt rounds
- **Session Management** - JWT-based sessions (30-day expiry)
- **Route Protection** - Middleware protecting dashboard and admin routes
- **User Profile** - Dropdown showing user info in navbar
- **Logout** - Secure sign-out functionality

### 📁 Files Created

**Authentication Core:**
- `auth.config.ts` - NextAuth configuration
- `auth.ts` - Auth exports (signIn, signOut, auth)
- `app/api/auth/[...nextauth]/route.ts` - Auth API endpoint
- `types/next-auth.d.ts` - TypeScript type extensions

**API Routes:**
- `app/api/auth/signup/route.ts` - User registration endpoint

**Pages:**
- `app/login/page.tsx` - Login page with form validation
- `app/signup/page.tsx` - Signup page with strong password requirements

**Utilities:**
- `lib/validations/auth.ts` - Zod schemas for login/signup
- `components/session-provider.tsx` - NextAuth session wrapper
- `middleware.ts` - Route protection middleware

**Configuration:**
- `.env.example` - Environment variables template

---

## 🚀 Setup Instructions

### 1. **Set Environment Variables**

Create a `.env` file in the project root:

```bash
# Generate AUTH_SECRET with:
openssl rand -base64 32
```

Then add to `.env`:

```env
DATABASE_URL="your-database-url-here"
AUTH_SECRET="paste-generated-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

### 2. **Run Database Migrations**

Ensure your database is set up with the User table:

```bash
pnpm db:push
# or
pnpm db:migrate
```

### 3. **Test the Authentication**

Start the development server:

```bash
pnpm dev
```

#### Create First User:
1. Navigate to http://localhost:3000/signup
2. Fill in the form:
   - **Name:** Your Name
   - **Email:** your@email.com
   - **Password:** Must be 8+ chars with uppercase, lowercase, and number
   - **Confirm Password:** Match the password
3. Click "Sign Up" - you'll be auto-logged in and redirected to dashboard

#### Test Login:
1. Click "Logout" in the navbar
2. Go to http://localhost:3000/login
3. Enter your email and password
4. Click "Sign In"

---

## 🔒 Security Features

✅ **Password Hashing** - bcrypt with 10 salt rounds  
✅ **CSRF Protection** - Built into NextAuth  
✅ **HTTP-only Cookies** - JWT stored securely  
✅ **Route Protection** - Middleware checks authentication  
✅ **Session Expiration** - 30-day automatic logout  
✅ **Password Requirements** - Strong password validation

---

## 🎨 UI/UX Features

- **Responsive Design** - Works on mobile, tablet, and desktop
- **Loading States** - Spinner animations during submission
- **Error Handling** - Clear error messages with toast notifications
- **Form Validation** - Real-time validation with react-hook-form + zod
- **User Dropdown** - Shows name, email, role in navbar
- **Theme Support** - Works with light/dark mode

---

## 🔄 Authentication Flow

```
User visits /dashboard (protected route)
         ↓
Middleware checks session
         ↓
No session? → Redirect to /login
         ↓
User enters credentials
         ↓
NextAuth validates against database
         ↓
Password verified with bcrypt.compare()
         ↓
JWT token created and stored in HTTP-only cookie
         ↓
User redirected to /dashboard
         ↓
Middleware allows access (valid session)
```

---

## 🛠️ Customization Options

### Change Session Duration
Edit `auth.config.ts`:
```typescript
session: {
  maxAge: 7 * 24 * 60 * 60, // 7 days instead of 30
}
```

### Change Default User Role
Edit `app/api/auth/signup/route.ts`:
```typescript
role: "MANAGER", // instead of "CASHIER"
```

### Add More Password Requirements
Edit `lib/validations/auth.ts`:
```typescript
.min(12, "Password must be at least 12 characters")
.regex(/[!@#$%^&*]/, "Must contain special character")
```

### Customize Protected Routes
Edit `middleware.ts`:
```typescript
const publicRoutes = ["/login", "/signup", "/about"];
```

---

## 📊 Database Schema

The User model in your Prisma schema:

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String   // Bcrypt hashed
  role      UserRole @default(CASHIER)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum UserRole {
  ADMIN
  MANAGER
  CASHIER
}
```

---

## 🐛 Troubleshooting

### "Invalid email or password" on login
- Check if user exists in database (`pnpm db:studio`)
- Verify password was hashed correctly during signup
- Check browser console for errors

### Redirects to login immediately after signing in
- Verify `AUTH_SECRET` is set in `.env`
- Check browser allows cookies
- Clear browser cache and cookies

### TypeScript errors
- Run `pnpm db:generate` to update Prisma types
- Restart TypeScript server in VS Code

### Middleware not protecting routes
- Check `middleware.ts` matcher config
- Verify session is being created (check Network tab)

---

## ✅ Next Steps

You can now:
1. ✅ Login and signup working
2. ✅ Protected routes functional
3. ✅ User session management active

Consider adding:
- [ ] Forgot password functionality
- [ ] Email verification
- [ ] Two-factor authentication
- [ ] Role-based access control (RBAC) for different pages
- [ ] User management page for admins
- [ ] Activity logging

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review browser console errors
3. Check terminal logs
4. Verify environment variables are set

**Authentication is now fully functional! 🎉**
