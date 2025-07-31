import { useState } from "react";
import "./App.css";
import { VoiceListener, useVoiceElement, useVoiceAction } from "chant-sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const emailRef = useVoiceElement("email-input", {
    selector: "#email-input",
    type: "input",
    label: "Email input field",
  });

  const passwordRef = useVoiceElement("password-input", {
    selector: "#password-input",
    type: "input",
    label: "Password input field",
  });

  const loginButtonRef = useVoiceElement("login-button", {
    selector: "#login-button",
    type: "button",
    label: "Login button",
  });

  useVoiceAction("login", {
    voice_triggers: ["log in", "login", "sign in", "authenticate"],
    description: "Login with email and password",
    steps: [
      "Enter email in the email input field",
      "Enter password in the password input field",
      "Click the login button",
    ],
  });

  const handleLogin = () => {
    if (email && password) {
      setIsLoggedIn(true);
    }
  };

  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-green-50 border-2 border-green-200 rounded-lg p-8 text-center">
          <h1 className="text-4xl font-bold text-green-800 mb-6">
            🎉 Login Successful! 🎉
          </h1>
          <p className="text-lg text-green-700 mb-6">
            Welcome to your dashboard! You have successfully logged in using voice
            commands.
          </p>
          <div className="bg-green-100 p-6 rounded-lg mb-6">
            <h3 className="text-xl font-semibold text-green-800 mb-4">
              User Details:
            </h3>
            <div className="space-y-2 text-left">
              <p className="text-green-700">
                <strong>Email:</strong> {email}
              </p>
              <p className="text-green-700">
                <strong>Login Time:</strong> {new Date().toLocaleString()}
              </p>
              <p className="text-green-700">
                <strong>Status:</strong> ✅ Authenticated
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setIsLoggedIn(false);
              setEmail("");
              setPassword("");
            }}
          >
            Logout
          </Button>
          <VoiceListener />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-center mb-6">Login</h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label htmlFor="email-input" className="text-sm font-medium">
                Email
              </label>
              <Input
                ref={emailRef}
                id="email-input"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  console.log("running in email change event", e.target.value);
                  setEmail(e.target.value);
                }}
                placeholder="Enter your email"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password-input" className="text-sm font-medium">
                Password
              </label>
              <Input
                ref={passwordRef}
                id="password-input"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => {
                  console.log("running in password change event", e.target.value);
                  setPassword(e.target.value);
                }}
                placeholder="Enter your password"
              />
            </div>
            <Button
              ref={loginButtonRef}
              id="login-button"
              type="submit"
              className="w-full"
            >
              Login
            </Button>
          </form>
        </div>
        <VoiceListener />
      </div>
    </div>
  );
}

export default App;
