import React, { useState } from 'react';
import { signupAPI, loginAPI, googleAuthAPI, updateProfileAPI } from '../api/auth.api';
import '../style/auth.css';

interface AuthOverlayProps {
  onAuthSuccess: (userProfile: any) => void;
}

export function AuthOverlay({ onAuthSuccess }: AuthOverlayProps) {
  const [isSignUpActive, setIsSignUpActive] = useState(false);

  // Sign In State
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signInSubmitting, setSignInSubmitting] = useState(false);

  // Sign Up State
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [signUpSubmitting, setSignUpSubmitting] = useState(false);

  // Handle Sign In Submit
  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSignInError(null);
    setSignInSubmitting(true);

    try {
      const response = await loginAPI(signInEmail, signInPassword);
      onAuthSuccess(response.user);
    } catch (err: any) {
      console.error(err);
      setSignInError(err.message ?? 'Invalid email or password');
    } finally {
      setSignInSubmitting(false);
    }
  };


  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSignUpError(null);
    setSignUpSubmitting(true);

    const cleanUsername = signUpName.trim().toLowerCase();
    if (!/^[a-zA-Z0-9_]{3,15}$/.test(cleanUsername)) {
      setSignUpError('Username must be 3-15 alphanumeric characters or underscores');
      setSignUpSubmitting(false);
      return;
    }

    try {
      // 1. Sign up the user
      const response = await signupAPI(signUpName.trim(), signUpEmail.trim(), signUpPassword);

      // 2. Immediately set the unique username
      try {
        const profileResponse = await updateProfileAPI({ username: cleanUsername });
        onAuthSuccess(profileResponse.user);
      } catch (profileErr: any) {
        // If username set failed, inform them they registered but username is taken/invalid
        setSignUpError(profileErr.message ?? 'Account created, but username is already taken. Please login and edit it in Settings.');
        setSignUpSubmitting(false);
      }
    } catch (err: any) {
      console.error(err);
      setSignUpError(err.message ?? 'Registration failed. A user with this email may already exist.');
      setSignUpSubmitting(false);
    }
  };

  // Handle Google Mock Auth
  const handleGoogleAuth = async () => {
    const defaultEmail = isSignUpActive ? signUpEmail : signInEmail;
    const promptEmail = prompt('Enter your Google email prefix to continue (e.g. praveen):', defaultEmail.split('@')[0] || 'praveen');
    if (!promptEmail) return;

    const cleanPrefix = promptEmail.trim().replace(/[^a-zA-Z0-9_.-]/g, '');
    if (!cleanPrefix) {
      alert('Invalid prefix entered');
      return;
    }

    try {
      const mockToken = `mock-google-${cleanPrefix}`;
      const response = await googleAuthAPI(mockToken);
      
      // If new Google user, set username automatically from prefix
      if (!response.user.username) {
        try {
          const profileResponse = await updateProfileAPI({ username: cleanPrefix.toLowerCase().slice(0, 15) });
          onAuthSuccess(profileResponse.user);
          return;
        } catch {
          // ignore username failure on google auto-register
        }
      }
      onAuthSuccess(response.user);
    } catch (err: any) {
      alert(err.message ?? 'Google Sign-In failed');
    }
  };

  return (
    <div className="vf-auth-backdrop">
      <div className="vf-auth-wrapper">
        <div className="vf-auth-brand-header">
          <h2>VideoForge</h2>
        </div>

        <div className={`vf-auth-container ${isSignUpActive ? 'right-panel-active' : ''}`} id="container">
          
          {/* SIGN UP PANEL */}
          <div className="vf-form-container vf-sign-up-container">
            <form onSubmit={handleSignUp}>
              <h1>Create Account</h1>
              <div className="vf-social-container">
                <button
                  type="button"
                  className="google-signin-btn"
                  onClick={handleGoogleAuth}
                  title="Sign up with Google"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.555 0-6.437-2.883-6.437-6.437 0-3.555 2.882-6.436 6.437-6.436 1.583 0 3.024.574 4.143 1.52l3.078-3.078C19.3 1.83 15.935 1 12.24 1 6.052 1 1 6.052 1 12.24s5.052 11.24 11.24 11.24c5.845 0 10.966-4.029 10.966-11.24 0-.768-.068-1.514-.2-2.228H12.24z" />
                  </svg>
                </button>
              </div>
              <span>or use your email for registration</span>
              
              {signUpError && <div className="vf-auth-error">{signUpError}</div>}
              
              <input
                type="text"
                placeholder="Username (unique identifier)"
                value={signUpName}
                onChange={(e) => setSignUpName(e.target.value)}
                required
                disabled={signUpSubmitting}
              />
              <input
                type="email"
                placeholder="Email"
                value={signUpEmail}
                onChange={(e) => setSignUpEmail(e.target.value)}
                required
                disabled={signUpSubmitting}
              />
              <input
                type="password"
                placeholder="Password"
                value={signUpPassword}
                onChange={(e) => setSignUpPassword(e.target.value)}
                required
                disabled={signUpSubmitting}
              />
              <button className="auth-action-btn" type="submit" disabled={signUpSubmitting}>
                {signUpSubmitting ? 'Creating...' : 'Sign Up'}
              </button>
            </form>
          </div>

          {/* SIGN IN PANEL */}
          <div className="vf-form-container vf-sign-in-container">
            <form onSubmit={handleSignIn}>
              <h1>Sign in</h1>
              <div className="vf-social-container">
                <button
                  type="button"
                  className="google-signin-btn"
                  onClick={handleGoogleAuth}
                  title="Sign in with Google"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.555 0-6.437-2.883-6.437-6.437 0-3.555 2.882-6.436 6.437-6.436 1.583 0 3.024.574 4.143 1.52l3.078-3.078C19.3 1.83 15.935 1 12.24 1 6.052 1 12.24 12.24s5.052 11.24 11.24 11.24c5.845 0 10.966-4.029 10.966-11.24 0-.768-.068-1.514-.2-2.228H12.24z" />
                  </svg>
                </button>
              </div>
              <span>or use your account</span>
              
              {signInError && <div className="vf-auth-error">{signInError}</div>}
              
              <input
                type="email"
                placeholder="Email"
                value={signInEmail}
                onChange={(e) => setSignInEmail(e.target.value)}
                required
                disabled={signInSubmitting}
              />
              <input
                type="password"
                placeholder="Password"
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
                required
                disabled={signInSubmitting}
              />
              <a href="#" className="forgot-pass" onClick={(e) => { e.preventDefault(); alert('Password recovery is under construction. Please use Google Sign-In or create a new account.'); }}>Forgot your password?</a>
              <button className="auth-action-btn" type="submit" disabled={signInSubmitting}>
                {signInSubmitting ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          </div>

          {/* DOUBLE SLIDING OVERLAY */}
          <div className="vf-overlay-container">
            <div className="vf-overlay">
              <div className="vf-overlay-panel vf-overlay-left">
                <h1>Welcome Back!</h1>
                <p>To keep connected with us please login with your personal info</p>
                <button className="ghost auth-action-btn" onClick={() => { setIsSignUpActive(false); setSignUpError(null); }}>Sign In</button>
              </div>
              <div className="vf-overlay-panel vf-overlay-right">
                <h1>Welcome to Video Service Friends !</h1>
                <p>Enter your personal details and start journey with us</p>
                <button className="ghost auth-action-btn" onClick={() => { setIsSignUpActive(true); setSignInError(null); }}>Sign Up</button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
