import React, { useState } from 'react';
import {
  Boxes,
  Lock,
  User,
  Mail,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { api, apiError, unwrap } from '../services/api';

export default function AuthPage({ onLoginSuccess }) {
  // Modes: 'login', 'signup', 'forgot', 'verify-otp', 'reset-password'
  const [mode, setMode] = useState('login');

  // Login form state
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign up form state
  const [signupLoginId, setSignupLoginId] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupRePassword, setSignupRePassword] = useState('');

  // Forgot password flow
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Status & messages
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 1. Handle Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', {
        loginId: loginId.trim(),
        password: loginPassword,
      });
      const data = unwrap(res);
      if (data?.token) {
        localStorage.setItem('stocksense_token', data.token);
      }
      onLoginSuccess(data.user);
    } catch (err) {
      // Wireframe specification: Exact error message
      const msg = apiError(err);
      if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('password') || msg.toLowerCase().includes('user')) {
        setErrorMessage('Invalid Login Id or Password');
      } else {
        setErrorMessage(msg || 'Invalid Login Id or Password');
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Sign Up
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Client-side quick validation per wireframe rules
    if (signupLoginId.trim().length < 6 || signupLoginId.trim().length > 12) {
      setErrorMessage('Login ID must be between 6 and 12 characters.');
      return;
    }
    if (signupPassword.length <= 8) {
      setErrorMessage('Password length must be more than 8 characters.');
      return;
    }
    if (!/[a-z]/.test(signupPassword)) {
      setErrorMessage('Password must contain at least one lowercase letter.');
      return;
    }
    if (!/[A-Z]/.test(signupPassword)) {
      setErrorMessage('Password must contain at least one uppercase letter.');
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(signupPassword)) {
      setErrorMessage('Password must contain at least one special character.');
      return;
    }
    if (signupPassword !== signupRePassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/signup', {
        loginId: signupLoginId.trim(),
        email: signupEmail.trim(),
        password: signupPassword,
        reEnterPassword: signupRePassword,
      });
      const data = unwrap(res);
      if (data?.token) {
        localStorage.setItem('stocksense_token', data.token);
      }
      onLoginSuccess(data.user);
    } catch (err) {
      setErrorMessage(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Forgot Password Flow
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail.trim() });
      setSuccessMessage(unwrap(res)?.message || 'If registered, an OTP has been sent.');
      setMode('verify-otp');
    } catch (err) {
      setErrorMessage(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', {
        email: forgotEmail.trim(),
        otp: otp.trim(),
      });
      const data = unwrap(res);
      setResetToken(data.resetToken);
      setSuccessMessage('OTP verified. Please set your new password.');
      setMode('reset-password');
    } catch (err) {
      setErrorMessage(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (newPassword.length <= 8) {
      setErrorMessage('Password length must be more than 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        resetToken,
        newPassword,
      });
      setSuccessMessage('Password reset successfully! You can now log in.');
      setMode('login');
    } catch (err) {
      setErrorMessage(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper" id="auth-page-container">
      <div className="auth-card-container">
        {/* App Logo Header matching Wireframe */}
        <div className="auth-app-logo" id="auth-app-logo">
          <div className="auth-logo-box">
            <Boxes size={28} className="text-cyan" />
          </div>
          <span className="auth-app-name">StockSense</span>
          <span className="auth-app-subtitle">Modular Inventory Management System</span>
        </div>

        {/* Global Notifications */}
        {errorMessage && (
          <div className="auth-alert auth-alert-error" id="auth-error-msg">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="auth-alert auth-alert-success" id="auth-success-msg">
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* -------------------- 1. LOGIN PAGE -------------------- */}
        {mode === 'login' && (
          <div className="auth-form-card" id="card-login-page">
            <div className="auth-view-header">
              <h2 className="auth-title">Login Page</h2>
              <p className="auth-desc">Sign in with your Login Id or registered Email.</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="auth-form" id="login-form">
              <div className="auth-input-group">
                <label htmlFor="login-id-input">Login Id</label>
                <div className="input-with-icon">
                  <User size={16} className="field-icon" />
                  <input
                    id="login-id-input"
                    type="text"
                    required
                    placeholder="Enter Login Id or Email"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label htmlFor="login-password-input">Password</label>
                <div className="input-with-icon">
                  <Lock size={16} className="field-icon" />
                  <input
                    id="login-password-input"
                    type="password"
                    required
                    placeholder="Enter Password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                id="btn-sign-in"
                className="btn btn-primary auth-submit-btn"
                disabled={loading}
              >
                {loading ? 'Signing in…' : 'SIGN IN'}
              </button>

              {/* Wireframe Links: Forget Password ? | Sign Up */}
              <div className="auth-footer-links">
                <button
                  type="button"
                  id="link-forgot-password"
                  className="auth-link-btn"
                  onClick={() => {
                    setErrorMessage('');
                    setSuccessMessage('');
                    setMode('forgot');
                  }}
                >
                  Forget Password ?
                </button>
                <span className="auth-link-divider">|</span>
                <button
                  type="button"
                  id="link-sign-up"
                  className="auth-link-btn"
                  onClick={() => {
                    setErrorMessage('');
                    setSuccessMessage('');
                    setMode('signup');
                  }}
                >
                  Sign Up
                </button>
              </div>
            </form>

            <div className="auth-credentials-hint">
              <small>Demo Accounts:</small>
              <div className="hint-row">
                <span>Manager: <code>manager</code> / <code>Password123!</code></span>
              </div>
              <div className="hint-row">
                <span>Staff: <code>staffuser</code> / <code>Password123!</code></span>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- 2. SIGN UP PAGE -------------------- */}
        {mode === 'signup' && (
          <div className="auth-form-card" id="card-signup-page">
            <div className="auth-view-header">
              <h2 className="auth-title">Sign up Page</h2>
              <p className="auth-desc">Create a user database into the system on signup.</p>
            </div>

            <form onSubmit={handleSignupSubmit} className="auth-form" id="signup-form">
              {/* Field 1: Enter Login Id */}
              <div className="auth-input-group">
                <label htmlFor="signup-login-id">Enter Login Id</label>
                <div className="input-with-icon">
                  <User size={16} className="field-icon" />
                  <input
                    id="signup-login-id"
                    type="text"
                    required
                    placeholder="Enter Login Id (6-12 characters)"
                    minLength={6}
                    maxLength={12}
                    value={signupLoginId}
                    onChange={(e) => setSignupLoginId(e.target.value)}
                  />
                </div>
                <small className="field-hint">Must be unique, 6–12 characters</small>
              </div>

              {/* Field 2: Enter Email Id */}
              <div className="auth-input-group">
                <label htmlFor="signup-email">Enter Email Id</label>
                <div className="input-with-icon">
                  <Mail size={16} className="field-icon" />
                  <input
                    id="signup-email"
                    type="email"
                    required
                    placeholder="Enter Email Id"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                  />
                </div>
                <small className="field-hint">Must not be duplicate in database</small>
              </div>

              {/* Field 3: Enter Password */}
              <div className="auth-input-group">
                <label htmlFor="signup-password">Enter Password</label>
                <div className="input-with-icon">
                  <Lock size={16} className="field-icon" />
                  <input
                    id="signup-password"
                    type="password"
                    required
                    placeholder="Enter Password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                  />
                </div>
                <small className="field-hint">
                  &gt;8 characters, 1 lowercase, 1 uppercase, 1 special character
                </small>
              </div>

              {/* Field 4: Re-Enter Password */}
              <div className="auth-input-group">
                <label htmlFor="signup-repassword">Re-Enter Password</label>
                <div className="input-with-icon">
                  <KeyRound size={16} className="field-icon" />
                  <input
                    id="signup-repassword"
                    type="password"
                    required
                    placeholder="Re-Enter Password"
                    value={signupRePassword}
                    onChange={(e) => setSignupRePassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                id="btn-sign-up"
                className="btn btn-primary auth-submit-btn"
                disabled={loading}
              >
                {loading ? 'Creating Account…' : 'SIGN UP'}
              </button>

              <div className="auth-footer-links text-center">
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => {
                    setErrorMessage('');
                    setSuccessMessage('');
                    setMode('login');
                  }}
                >
                  Already have an account? Sign In
                </button>
              </div>
            </form>
          </div>
        )}

        {/* -------------------- 3. FORGOT PASSWORD (OTP FLOW) -------------------- */}
        {mode === 'forgot' && (
          <div className="auth-form-card" id="card-forgot-page">
            <div className="auth-view-header">
              <h2 className="auth-title">Reset Password</h2>
              <p className="auth-desc">Enter your registered email to receive a 6-digit OTP code.</p>
            </div>

            <form onSubmit={handleForgotSubmit} className="auth-form">
              <div className="auth-input-group">
                <label>Enter Registered Email</label>
                <div className="input-with-icon">
                  <Mail size={16} className="field-icon" />
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
                {loading ? 'Sending OTP…' : 'Send Reset OTP'}
              </button>

              <div className="auth-footer-links text-center">
                <button type="button" className="auth-link-btn" onClick={() => setMode('login')}>
                  Back to Sign In
                </button>
              </div>
            </form>
          </div>
        )}

        {mode === 'verify-otp' && (
          <div className="auth-form-card" id="card-verify-otp">
            <div className="auth-view-header">
              <h2 className="auth-title">Verify OTP Code</h2>
              <p className="auth-desc">Enter the 6-digit code sent to {forgotEmail}.</p>
            </div>

            <form onSubmit={handleVerifyOtpSubmit} className="auth-form">
              <div className="auth-input-group">
                <label>6-Digit OTP Code</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="123456"
                  className="font-mono text-center tracking-widest text-lg"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
                {loading ? 'Verifying…' : 'Verify Code'}
              </button>

              <div className="auth-footer-links text-center">
                <button type="button" className="auth-link-btn" onClick={() => setMode('forgot')}>
                  Resend OTP
                </button>
              </div>
            </form>
          </div>
        )}

        {mode === 'reset-password' && (
          <div className="auth-form-card" id="card-new-password">
            <div className="auth-view-header">
              <h2 className="auth-title">Choose New Password</h2>
              <p className="auth-desc">Must be &gt;8 characters with uppercase, lowercase and special character.</p>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="auth-form">
              <div className="auth-input-group">
                <label>New Password</label>
                <div className="input-with-icon">
                  <Lock size={16} className="field-icon" />
                  <input
                    type="password"
                    required
                    placeholder="Enter new strong password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
                {loading ? 'Updating…' : 'Set New Password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
