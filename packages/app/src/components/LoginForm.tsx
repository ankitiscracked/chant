import { useState } from "react";
import { useVoiceElement } from "chant-sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LOGIN_ACTION_ID } from "@/lib/utils";

interface LoginFormProps {
  onLogin: (email: string, password: string) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const emailRef = useVoiceElement(LOGIN_ACTION_ID, {
    type: "input",
    label: "Email input field",
  });

  const passwordRef = useVoiceElement(LOGIN_ACTION_ID, {
    type: "input",
    label: "Password input field",
  });

  const loginButtonRef = useVoiceElement(LOGIN_ACTION_ID, {
    type: "button",
    label: "Login button",
  });

  const handleLogin = () => {
    if (email && password) {
      onLogin(email, password);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="p-6 border rounded-lg shadow-lg bg-card">
          <h1 className="mb-6 text-2xl font-bold text-center">Login</h1>
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
                  console.log(
                    "running in password change event",
                    e.target.value
                  );
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
      </div>
    </div>
  );
}
