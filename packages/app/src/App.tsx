import { AppLayout } from "@/components/AppLayout";
import { Example1 } from "@/components/Example1";
import { Example2 } from "@/components/Example2";
import { LoginForm } from "@/components/LoginForm";
import {
  VoiceListener,
  VoiceEngineProvider,
  VoiceEngine,
  type Action,
  type ExecFunctionResult,
} from "chant-sdk";
import { useEffect, useState } from "react";
import { Route, Router } from "wouter";
import { useVoiceActions } from "chant-sdk";
import {
  CREATE_SUPPORT_TICKET_ACTION_ID,
  LOGIN_ACTION_ID,
  ADD_TO_CART_ACTION_ID,
  SHOW_ALL_ACTIONS_ID,
  SHOW_PAGE_ACTIONS_ID,
} from "./lib/utils";

// Centralized voice actions configuration
const VOICE_ACTIONS: Action[] = [
  {
    actionId: LOGIN_ACTION_ID,
    voice_triggers: ["log in", "login", "sign in", "authenticate"],
    description: "Login with email and password",
    steps: [
      "Enter email in the email input field",
      "Enter password in the password input field",
      "Click the login button",
    ],
    route: "/",
    pauseOnRequiredField: false,
  },
  {
    actionId: CREATE_SUPPORT_TICKET_ACTION_ID,
    voice_triggers: [
      "create ticket",
      "new ticket",
      "add ticket",
      "open ticket",
      "create support ticket",
    ],
    description: "Create a new support ticket",
    steps: [
      "Click the create ticket button",
      "Enter ticket title",
      "Enter ticket description",
      "Select priority if needed",
      "Submit the ticket",
    ],
    route: "/example2",
    pauseOnRequiredField: false,
  },
  {
    actionId: ADD_TO_CART_ACTION_ID,
    voice_triggers: [
      "add to cart",
      "buy",
      "purchase",
      "add item",
      "shop for",
      "get",
    ],
    description:
      "Add a product to cart by name or description and proceed to checkout",
    steps: [
      "Find the product that matches the spoken name or description",
      "Click the 'Add to Cart' button for that product",
      "Click the cart button to continue",
      "Click the checkout button to complete the purchase",
    ],
    route: "/example1",
    pauseOnRequiredField: false,
  },
  {
    actionId: SHOW_ALL_ACTIONS_ID,
    voice_triggers: [
      "show all actions",
      "list all actions",
      "what actions are available",
      "show me all commands",
      "list commands",
    ],
    description: "Show all available voice actions across the app",
    execFunction: (): ExecFunctionResult => {
      const allActions = voiceEngineInstance.getActions();
      const actionList = Array.from(allActions.values()).map((action) => ({
        id: action.actionId,
        description: action.description,
        triggers: action.voice_triggers,
        route: action.route || "Global",
      }));

      return {
        resultText: `Found ${actionList.length} actions available`,
        userInfo: actionList.map(
          (action) =>
            `${action.description} (${
              action.route
            }) - Triggers: "${action.triggers.join('", "')}"`
        ),
        error: "",
      };
    },
  },
  {
    actionId: SHOW_PAGE_ACTIONS_ID,
    voice_triggers: [
      "show page actions",
      "what can I do here",
      "show current page actions",
      "list page commands",
      "what actions work on this page",
    ],
    description: "Show available voice actions for the current page",
    execFunction: (): ExecFunctionResult => {
      const currentRoute = voiceEngineInstance.getCurrentRoute();
      const availableActions =
        voiceEngineInstance.getAvailableActionsForCurrentRoute();

      if (availableActions.length === 0) {
        return {
          resultText: "No actions available for this page",
          userInfo: [
            `Current route: ${currentRoute}`,
            "No voice actions are registered for this specific page.",
          ],
          error: "",
        };
      }

      return {
        resultText: `Found ${availableActions.length} actions for this page`,
        userInfo: availableActions.map(
          (action) =>
            `${action.description} - Say: "${action.voice_triggers[0]}"`
        ),
        error: "",
      };
    },
  },
];

// Create singleton VoiceEngine instance
const voiceEngineInstance = new VoiceEngine({
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY,
});

function App() {
  const [email, setEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useVoiceActions(VOICE_ACTIONS);

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

  return (
    <>
      {!isLoggedIn ? (
        <LoginForm onLogin={handleLogin} />
      ) : (
        <Router>
          <AppLayout email={email} onLogout={handleLogout}>
            <Route path="/" component={() => <Example1 />} />
            <Route path="/example1" component={() => <Example1 />} />
            <Route path="/example2" component={() => <Example2 />} />
          </AppLayout>
        </Router>
      )}
      <VoiceListener />
    </>
  );
}

function Main() {
  return (
    <VoiceEngineProvider voiceEngine={voiceEngineInstance}>
      <App />
    </VoiceEngineProvider>
  );
}

export default Main;
