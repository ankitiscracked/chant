import { useState, useEffect } from "react";
import { Router, Route } from "wouter";
import "./App.css";
import { LoginForm } from "@/components/LoginForm";
import { AppLayout } from "@/components/AppLayout";
import { Example1 } from "@/components/Example1";
import { Example2 } from "@/components/Example2";

function App() {
  const [email, setEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem("chant-app-email");
    const savedLoginState = localStorage.getItem("chant-app-logged-in");
    
    if (savedEmail && savedLoginState === "true") {
      setEmail(savedEmail);
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = (userEmail: string, password: string) => {
    setEmail(userEmail);
    setIsLoggedIn(true);
    localStorage.setItem("chant-app-email", userEmail);
    localStorage.setItem("chant-app-logged-in", "true");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setEmail("");
    localStorage.removeItem("chant-app-email");
    localStorage.removeItem("chant-app-logged-in");
  };

  if (!isLoggedIn) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <Router>
      <AppLayout email={email} onLogout={handleLogout}>
        <Route path="/" component={() => <Example1 />} />
        <Route path="/example1" component={() => <Example1 />} />
        <Route path="/example2" component={() => <Example2 />} />
      </AppLayout>
    </Router>
  );
}

export default App;
