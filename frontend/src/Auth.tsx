import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Lock, Mail, User, ArrowRight } from "lucide-react";

const API_BASE_URL = "http://127.0.0.1:8000";

type AuthProps = {
  onLogin: (token: string, user: { name: string; email: string }) => void;
};

export default function Auth({ onLogin }: AuthProps) {
  const [isRegister, setIsRegister] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const endpoint = isRegister ? "/register" : "/login";

      const body = isRegister
        ? { name, email, password }
        : { email, password };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Something went wrong");
      }

      if (isRegister) {
        setIsRegister(false);
        setName("");
        setPassword("");
        setError("");

        alert("Account created successfully. Please login.");
      } else {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem(
          "user",
          JSON.stringify({
            name: data.name,
            email: data.email,
          })
        );

        onLogin(data.access_token, {
          name: data.name,
          email: data.email,
        });
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to server"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-white flex items-center justify-center px-6 relative overflow-hidden">
      
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-120px] left-[-100px] w-[400px] h-[400px] bg-indigo-600/15 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-150px] right-[-100px] w-[450px] h-[450px] bg-purple-600/15 blur-[130px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck size={30} />
            </div>
          </div>

          <h1 className="text-3xl font-bold">
            ReguTrack
          </h1>

          <p className="text-slate-400 mt-2">
            Intelligent Compliance Monitoring
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-7 shadow-2xl">

          <h2 className="text-xl font-semibold mb-1">
            {isRegister ? "Create your account" : "Welcome back"}
          </h2>

          <p className="text-sm text-slate-400 mb-6">
            {isRegister
              ? "Create an account to start monitoring reports."
              : "Login to access your compliance dashboard."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Name */}
            {isRegister && (
              <div>
                <label className="text-sm text-slate-300 mb-2 block">
                  Full Name
                </label>

                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    required
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="text-sm text-slate-300 mb-2 block">
                Email
              </label>

              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-sm text-slate-300 mb-2 block">
                Password
              </label>

              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 rounded-xl py-3 font-medium flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : isRegister
                ? "Create Account"
                : "Login"}

              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          {/* Toggle */}
          <div className="text-center mt-6 text-sm text-slate-400">
            {isRegister
              ? "Already have an account?"
              : "Don't have an account?"}

            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
              className="ml-2 text-indigo-400 hover:text-indigo-300 font-medium"
            >
              {isRegister ? "Login" : "Create account"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          ReguTrack • Regulatory Reporting & Compliance Intelligence
        </p>
      </motion.div>
    </div>
  );
}