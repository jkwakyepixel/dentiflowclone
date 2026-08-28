import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: userCredential.user.email,
          role: 'admin',
          clinicId: `clinic_${userCredential.user.uid}`,
          createdAt: new Date().toISOString()
        });
        toast.success('Account created successfully');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Successfully logged in');
      }
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || `Failed to ${isSignUp ? 'create account' : 'login'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          email: userCredential.user.email,
          role: 'admin',
          clinicId: `clinic_${userCredential.user.uid}`,
          createdAt: new Date().toISOString(),
          displayName: userCredential.user.displayName || ''
        });
      } else {
        const data = userDoc.data();
        if (data.clinicId === 'demo-clinic') {
          await setDoc(userDocRef, {
            clinicId: `clinic_${userCredential.user.uid}`
          }, { merge: true });
        }
      }
      
      toast.success('Successfully logged in with Google');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to login with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans">
      {/* Left Panel - Image Background */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden flex-col">
        {/* Background Image with Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-50 transition-opacity duration-1000"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=1470&auto=format&fit=crop")' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1e3a8a]/80 via-[#1e3a8a]/60 to-[#0f172a]/95" />
        
        {/* Logo */}
        <div className="relative z-10 p-10 flex items-center gap-3">
          <div className="bg-white text-blue-600 p-2 rounded-xl shadow-lg">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21c-2 0-3-2-3-4s-1-4-3-4-3 2-3 4 1 5 3 5c1 0 2-1 2-2 1-2 2-2 3-2h2c1 0 2 0 3 2 0 1 1 2 2 2 2 0 3-3 3-5s-1-4-3-4-3 2-3 4-1 4-3 4z" />
            </svg>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">SmileDesk</span>
        </div>

        {/* Bottom Text */}
        <div className="relative z-10 mt-auto p-12 mb-8">
          <h1 className="text-4xl font-extrabold text-white mb-4 tracking-tight leading-tight">
            Gentle care for <br />every smile.
          </h1>
          <p className="text-blue-100/80 text-lg max-w-md leading-relaxed font-medium">
            Appointments, patients, invoices and payments — everything your reception team needs, in one clean workspace.
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-6 sm:px-12 lg:px-20 xl:px-32 bg-[#F8FAFC]">
        <div className="mx-auto w-full max-w-md">
          <h2 className="text-[32px] font-bold tracking-tight text-slate-900">
            {isSignUp ? 'Create account' : 'Welcome back'}
          </h2>
          <p className="mt-2 text-[15px] text-slate-500 mb-8 font-medium">
            {isSignUp ? 'Sign up to create your clinic dashboard.' : 'Sign in to access your clinic dashboard.'}
          </p>

          <form className="space-y-5" onSubmit={handleAuth}>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-[#EEF2FF] border border-transparent rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors sm:text-sm font-medium"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-11 py-3 bg-[#EEF2FF] border border-transparent rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors sm:text-sm font-medium"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-400 hover:text-slate-600 transition-colors" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-400 hover:text-slate-600 transition-colors" />
                  )}
                </button>
              </div>
            </div>

            {!isSignUp && (
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-500 font-medium">
                    Remember me
                  </label>
                </div>
                <div className="text-sm">
                  <a href="#" className="font-semibold text-blue-600 hover:text-blue-500">
                    Forgot password?
                  </a>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[#1D4ED8] hover:bg-[#1e40af] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-50 transition-colors mt-2"
            >
              {loading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Sign Up' : 'Sign In')}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-[#F8FAFC] px-4 text-slate-400 font-medium">Or continue with</span>
              </div>
            </div>

            <div className="mt-8 gap-4 flex flex-col">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="flex w-full justify-center items-center gap-3 rounded-xl border border-slate-200 bg-white py-3 px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  <path d="M1 1h22v22H1z" fill="none" />
                </svg>
                Sign in with Google
              </button>
            </div>
          </div>

          <div className="mt-8 text-center text-sm">
            <span className="text-slate-500 font-medium">
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            </span>
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="font-bold text-blue-600 hover:text-blue-700 transition-colors ml-1"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
