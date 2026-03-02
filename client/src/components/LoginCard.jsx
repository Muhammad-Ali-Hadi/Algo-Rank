import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import Logo from "./Logo";

export default function LoginCard() {
  const { signIn, signUp, supabase } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [validationPopup, setValidationPopup] = useState({
    show: false,
    message: "",
  });

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [loginId, setLoginId] = useState(""); // email or username for sign-in
  const [showPassword, setShowPassword] = useState(false);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setUsername("");
    setLoginId("");
    setError(null);
    setSuccess(null);
    setValidationPopup({ show: false, message: "" });
  };

  // Validation helper functions for real-time feedback
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const passwordRegex = /^(?=.*\d.*\d)[^\s]+$/;

  const validateEmail = (emailValue) => {
    return {
      isValid: emailRegex.test(emailValue.trim()),
      hasSpace: /\s/.test(emailValue),
      hasInvalidChars: !/^[a-zA-Z0-9._@-]*$/.test(emailValue),
      hasAtSign: emailValue.includes("@"),
      hasDot: emailValue.includes("."),
    };
  };

  const validatePassword = (passwordValue) => {
    return {
      isValid: passwordRegex.test(passwordValue) && passwordValue.length >= 8,
      minLength: passwordValue.length >= 8,
      hasDigits: (passwordValue.match(/\d/g) || []).length >= 2,
      noSpaces: !/\s/.test(passwordValue),
    };
  };

  const validateUsername = (usernameValue) => {
    return {
      isValid:
        usernameValue.length >= 3 && /^[a-zA-Z0-9_]+$/.test(usernameValue),
      minLength: usernameValue.length >= 3,
      validChars: /^[a-zA-Z0-9_]*$/.test(usernameValue),
    };
  };

  const toggleMode = () => {
    resetForm();
    setIsSignUp((prev) => !prev);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setValidationPopup({ show: false, message: "" });

    // Regex patterns for validation
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const passwordRegex = /^(?=.*\d.*\d)[^\s]+$/; // At least 2 digits, no spaces

    if (isSignUp) {
      // Validation for sign-up
      if (
        !email.trim() ||
        !password.trim() ||
        !name.trim() ||
        !username.trim()
      ) {
        setError("All fields are required.");
        return;
      }
      if (username.length < 3) {
        setError("Username must be at least 3 characters.");
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setError(
          "Username can only contain letters, numbers, and underscores.",
        );
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }

      // Collect all validation errors
      const errors = [];

      // Regex validation for email
      if (!emailRegex.test(email.trim())) {
        errors.push(
          "• Invalid email format (e.g., user@gmail.com). No spaces or invalid special characters allowed.",
        );
      }

      // Regex validation for password (minimum 8 characters, at least 2 digits, no spaces)
      if (password.length < 8) {
        errors.push("• Password must be at least 8 characters long.");
      }

      if (!passwordRegex.test(password)) {
        errors.push(
          "• Password must contain at least 2 numeric digits and no spaces.",
        );
      }

      // If there are validation errors, show them all
      if (errors.length > 0) {
        setValidationPopup({
          show: true,
          message: errors.join("\n"),
        });
        return;
      }

      try {
        setLoading(true);

        // Check if username is already taken
        const { data: existing } = await supabase
          .from("users")
          .select("username")
          .eq("username", username)
          .single();

        if (existing) {
          setError("Username is already taken.");
          setLoading(false);
          return;
        }

        const data = await signUp(email, password, name, username);
        // signUp now auto signs-in, so redirect happens automatically via auth listener
      } catch (err) {
        setError(err?.message || "Sign-up failed. Please try again.");
      } finally {
        setLoading(false);
      }
    } else {
      // Validation for sign-in
      if (!loginId.trim() || !password.trim()) {
        setError("Username/email and password are required.");
        return;
      }

      // Collect all validation errors
      const errors = [];

      // Regex validation for email if loginId contains @
      if (loginId.includes("@")) {
        if (!emailRegex.test(loginId.trim())) {
          errors.push(
            "• Invalid email format. No spaces or invalid special characters allowed.",
          );
        }
      }

      // Regex validation for password (minimum 8 characters, at least 2 digits, no spaces)
      if (password.length < 8) {
        errors.push("• Password must be at least 8 characters long.");
      }

      if (!passwordRegex.test(password)) {
        errors.push(
          "• Password must contain at least 2 numeric digits and no spaces.",
        );
      }

      // If there are validation errors, show them all
      if (errors.length > 0) {
        setValidationPopup({
          show: true,
          message: errors.join("\n"),
        });
        return;
      }

      try {
        setLoading(true);
        await signIn(loginId, password);
      } catch (err) {
        setValidationPopup({
          show: true,
          message: "Username or password is not correct",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <motion.div
      className="relative w-full max-w-md mx-auto"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Validation Popup */}
      <AnimatePresence>
        {validationPopup.show && (
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() =>
              setValidationPopup({ ...validationPopup, show: false })
            }
          >
            <motion.div
              className="relative bg-surface border border-border rounded-2xl p-6 max-w-sm mx-4 shadow-2xl"
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button (Red X) */}
              <button
                onClick={() =>
                  setValidationPopup({ ...validationPopup, show: false })
                }
                className="absolute -top-3 -right-3 text-red-400 hover:text-red-300 transition-colors p-1"
                tabIndex={-1}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              {/* Message */}
              <p className="text-center text-foreground text-sm font-medium whitespace-pre-line">
                {validationPopup.message}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Outer glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-2xl blur-xl opacity-50" />

      {/* Card */}
      <div className="relative glass-strong rounded-2xl p-8 sm:p-10 space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>

        {/* Tagline */}
        <motion.p
          className="text-center text-muted text-base sm:text-lg font-medium tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Compete. Solve. Rank.
        </motion.p>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-surface px-4 text-xs text-muted uppercase tracking-widest">
              {isSignUp ? "Create Account" : "Sign In"}
            </span>
          </div>
        </div>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          className="space-y-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          {isSignUp ? (
            /* ====== SIGN UP FIELDS ====== */
            <>
              {/* Name */}
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.2 }}
              >
                <label className="block text-sm text-muted mb-1.5 font-medium">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Muhammad Ali"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-border
                             text-foreground placeholder:text-muted/40 text-sm
                             focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20
                             transition-all duration-200"
                  autoComplete="name"
                />
                {name && (
                  <div className="mt-2 text-xs text-green-400">
                    ✓ Full name entered
                  </div>
                )}
              </motion.div>

              {/* Username */}
              <div>
                <label className="block text-sm text-muted mb-1.5 font-medium">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) =>
                    setUsername(
                      e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                    )
                  }
                  placeholder="algo_master"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-border
                             text-foreground placeholder:text-muted/40 text-sm
                             focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20
                             transition-all duration-200"
                  autoComplete="username"
                />
                {username && (
                  <div className="mt-2 space-y-1 text-xs">
                    <div
                      className={
                        validateUsername(username).minLength
                          ? "text-green-400"
                          : "text-yellow-400"
                      }
                    >
                      {validateUsername(username).minLength ? "✓" : "○"} At
                      least 3 characters
                    </div>
                    <div
                      className={
                        validateUsername(username).validChars
                          ? "text-green-400"
                          : "text-yellow-400"
                      }
                    >
                      {validateUsername(username).validChars ? "✓" : "○"} Only
                      letters, numbers, underscores
                    </div>
                  </div>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm text-muted mb-1.5 font-medium">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-border
                             text-foreground placeholder:text-muted/40 text-sm
                             focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20
                             transition-all duration-200"
                  autoComplete="email"
                />
                {email && (
                  <div className="mt-2 space-y-1 text-xs">
                    <div
                      className={
                        validateEmail(email).hasSpace
                          ? "text-yellow-400"
                          : "text-green-400"
                      }
                    >
                      {!validateEmail(email).hasSpace ? "✓" : "○"} No spaces
                      allowed
                    </div>
                    <div
                      className={
                        validateEmail(email).hasInvalidChars
                          ? "text-yellow-400"
                          : "text-green-400"
                      }
                    >
                      {!validateEmail(email).hasInvalidChars ? "✓" : "○"} No
                      invalid special characters
                    </div>
                    <div
                      className={
                        validateEmail(email).isValid
                          ? "text-green-400"
                          : "text-yellow-400"
                      }
                    >
                      {validateEmail(email).isValid ? "✓" : "○"} Valid email
                      format (user@domain.com)
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* ====== SIGN IN FIELDS ====== */
            <div>
              <label className="block text-sm text-muted mb-1.5 font-medium">
                Username or Email
              </label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="algo_master or you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-border
                           text-foreground placeholder:text-muted/40 text-sm
                           focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20
                           transition-all duration-200"
                autoComplete="username"
              />
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-sm text-muted mb-1.5 font-medium">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-border
                           text-foreground placeholder:text-muted/40 text-sm
                           focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20
                           transition-all duration-200 pr-11"
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
            {password && isSignUp && (
              <div className="mt-2 space-y-1 text-xs">
                <div
                  className={
                    validatePassword(password).minLength
                      ? "text-green-400"
                      : "text-yellow-400"
                  }
                >
                  {validatePassword(password).minLength ? "✓" : "○"} Minimum 8
                  characters
                </div>
                <div
                  className={
                    validatePassword(password).hasDigits
                      ? "text-green-400"
                      : "text-yellow-400"
                  }
                >
                  {validatePassword(password).hasDigits ? "✓" : "○"} At least 2
                  numeric digits
                </div>
                <div
                  className={
                    validatePassword(password).noSpaces
                      ? "text-green-400"
                      : "text-yellow-400"
                  }
                >
                  {validatePassword(password).noSpaces ? "✓" : "○"} No spaces
                  allowed
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                className="text-red-400 text-sm text-center bg-red-400/5 rounded-lg py-2 px-3"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Success */}
          <AnimatePresence>
            {success && (
              <motion.p
                className="text-green-400 text-sm text-center bg-green-400/5 rounded-lg py-2 px-3"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {success}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={loading}
            className="relative w-full flex items-center justify-center gap-2 px-6 py-3.5
                       rounded-xl bg-accent text-white font-medium text-sm
                       hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors duration-200 overflow-hidden group"
            whileHover={{ scale: loading ? 1 : 1.01 }}
            whileTap={{ scale: loading ? 1 : 0.99 }}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>
                  {isSignUp ? "Creating account..." : "Signing in..."}
                </span>
              </div>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {isSignUp ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                    />
                  )}
                </svg>
                <span>{isSignUp ? "Create Account" : "Sign In"}</span>
              </>
            )}
          </motion.button>
        </motion.form>

        {/* Toggle sign-in / sign-up */}
        <motion.div
          className="text-center text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <span className="text-muted">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}
          </span>{" "}
          <button
            type="button"
            onClick={toggleMode}
            className="text-primary hover:text-primary/80 font-medium transition-colors"
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </motion.div>

        {/* Footer */}
        <motion.p
          className="text-center text-muted/60 text-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          By signing in, you agree to our Terms of Service and Privacy Policy
        </motion.p>
      </div>
    </motion.div>
  );
}
