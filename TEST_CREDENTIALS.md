# Test Credentials for LMS App

## 🔐 Mock Authentication Users

The app is currently using **Mock Authentication** for development. You can use these pre-created accounts to test the login functionality:

### 🧪 Test Accounts

| Email | Password | Name | Role |
|-------|----------|------|------|
| `test@example.com` | `password123` | Test User | Regular User |
| `demo@lms.com` | `demo123` | Demo User | Regular User |
| `admin@lms.com` | `admin123` | Admin User | Admin |

### 🚀 Quick Testing

1. **Open the app** → You'll see the AuthScreen
2. **Try Login** → Use any of the accounts above
3. **Wrong Password** → You'll see "Incorrect password" error
4. **Wrong Email** → You'll see "No account found with this email"
5. **Signup** → Create a new account with any email/password

### ✅ Expected Behavior

- ✅ **Correct Email + Correct Password** → Login successful → Navigate to Tab Navigation
- ❌ **Correct Email + Wrong Password** → "Incorrect password" error
- ❌ **Wrong Email + Any Password** → "No account found with this email" error
- ✅ **New Email + Password** → Signup successful → Navigate to Tab Navigation

### 🔧 Custom Test Users

You can also create new users by:
1. Going to the "Create Account" tab
2. Enter any email and password (minimum 6 characters)
3. The account will be created and available for login

### 🛠️ Development Mode

**Current Setting**: `USE_MOCK_AUTH = true`

To switch to real Firebase:
1. Set up Firebase (see `FIREBASE_SETUP.md`)
2. Update `src/Services/index.js`:
   ```javascript
   export const USE_MOCK_AUTH = false;
   ```

### 🐛 Common Issues & Solutions

**Issue**: Login succeeds even with wrong password
- **Solution**: App might be using cached version. Restart the app.

**Issue**: Account not found for new signup
- **Solution**: Make sure you're on the "Create Account" tab, not "Sign In"

**Issue**: Navigation doesn't change after login
- **Solution**: Check console for errors, restart Metro bundler

---

**⚠️ Security Note**: This is for development only. In production, use proper Firebase authentication with secure password handling.