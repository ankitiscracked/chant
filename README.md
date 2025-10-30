# Chant

Chant lets you drop a voice-enabled companion into any React web app. Speak a request, the SDK understands the page, plans out steps like navigate, click, set input value, wait, and then carries them out with DOM APIs. This repo holds the SDK itself plus a small demo app that shows the whole flow.

## What's in this repo

- `packages/sdk` – the core voice engine published as `chant-sdk`
- `packages/app` – a Vite + React demo that wires the SDK into a sample help desk + storefront

## How the SDK works

- The `VoiceEngine` listens for speech, sends it to a language model, and keeps track of the current route and execution state.
- Voice actions are described in everyday language through the `useVoiceAction` hook (or `useVoiceActions` if you want to register many at once).
- DOM elements are linked to those actions with the `useVoiceElement` hook so the engine knows which button, field, or section to touch.
- When a user speaks, the engine builds a plan made of simple steps (`navigate`, `click`, `setValue`, `wait`, and so on) and runs them through standard DOM APIs.
- The `VoiceListener` component gives the user interface for recording, feedback, and status updates.

## Quick start

### 1. Install dependencies

```bash
bun install
```

> Prefer npm or pnpm? They work too because this is a standard workspace, just replace `bun` with your package manager of choice.

### 2. Add your Gemini API key

The SDK needs a Google Gemini API key to generate action plans.
Create `packages/app/.env.local` (or reuse your own setup) and add:

```
VITE_GEMINI_API_KEY=your_api_key_here
```

Use the same key wherever you create a `VoiceEngine` instance in your own project.

### 3. Run the demo app

```bash
cd packages/app
bun run dev
```

Open `http://localhost:5173` and log in with any email/password to explore the sample flows.

### 4. Build or watch the SDK

```bash
cd packages/sdk
bun run build       # one-off build
bun run dev         # rebuild on change
```

## Registering a voice action

Here is the minimum wiring you need in a React screen:

```tsx
import {
  VoiceEngine,
  VoiceEngineProvider,
  VoiceListener,
  useVoiceAction,
  useVoiceElement,
} from "chant-sdk";

const voiceEngine = new VoiceEngine({
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY,
});

function LoginForm() {
  useVoiceAction({
    actionId: "login",
    voice_triggers: ["log in", "sign in"],
    description: "Log in with email and password",
    steps: [
      "Fill the email field",
      "Fill the password field",
      "Press the log in button",
    ],
  });

  const emailRef = useVoiceElement("login", {
    selector: "#email",
    label: "Email input",
    type: "input",
  });

  const passwordRef = useVoiceElement("login", {
    selector: "#password",
    label: "Password input",
    type: "input",
  });

  const submitRef = useVoiceElement("login", {
    selector: "#login-button",
    label: "Log in button",
    type: "button",
  });

  return (
    <form>
      <input id="email" ref={emailRef} />
      <input id="password" type="password" ref={passwordRef} />
      <button id="login-button" ref={submitRef}>
        Log in
      </button>
    </form>
  );
}

export function App() {
  return (
    <VoiceEngineProvider voiceEngine={voiceEngine}>
      <LoginForm />
      <VoiceListener />
    </VoiceEngineProvider>
  );
}
```

Once the action and elements are registered, the voice companion can fill the form and submit it on its own.

## Demo app highlights

- A login screen hooked up to the voice action above.
- A product listing that demonstrates multi-step actions like add-to-cart and checkout.
- A support ticket flow that shows off variable extraction and long-form text entry.
- Helper actions that read out what you can do on the current page or across the whole app.

## Need more detail?

The SDK ships with an in-depth guide and API reference in `packages/sdk/README.md`. Check it out for advanced scenarios, troubleshooting tips, and deeper explanations of each hook and service.
