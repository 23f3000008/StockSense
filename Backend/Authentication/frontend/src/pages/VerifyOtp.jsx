import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import * as authApi from '../api/authApi';
import AuthLayout from '../components/AuthLayout';

export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { resetToken } = await authApi.verifyOtp(email, otp);
      navigate('/reset-password', { state: { resetToken } });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    setError('');
    setResending(true);
    try {
      await authApi.forgotPassword(email);
      setResent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      title="Enter your code"
      subtitle={`We sent a 6-digit code to ${email || 'your email'}. It expires in 10 minutes.`}
      footer={<Link to="/login">Back to sign in</Link>}
    >
      <form onSubmit={onSubmit} noValidate>
        {error && <div className="auth-error">{error}</div>}
        {resent && <div className="auth-success">A new code has been sent.</div>}
        {!location.state?.email && (
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
        )}
        <div className="field">
          <label htmlFor="otp">OTP code</label>
          <input
            id="otp"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
          />
        </div>
        <button className="btn block" type="submit" disabled={submitting}>
          {submitting ? 'Verifying…' : 'Verify code'}
        </button>
        <div className="auth-link-row">
          <button type="button" className="link-btn" onClick={onResend} disabled={resending}>
            {resending ? 'Resending…' : "Didn't get a code? Resend"}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
