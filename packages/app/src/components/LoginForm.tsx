import { useState } from "react";
import { VoiceListener, useVoiceElement, useVoiceAction } from "chant-sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LoginFormProps {
  onLogin: (email: string, password: string) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
      onLogin(email, password);
    }
  };

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