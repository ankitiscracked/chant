# Chant SDK

Chant adds a voice companion to any React web app. A user can ask for something, the SDK understands the page, plans out small steps like "click the checkout button" or "fill the email field", and runs them through the browser with plain DOM APIs.

This document explains the core ideas, shows the main hooks, and points you toward the demo app that lives in this monorepo.

## What lives in this package
- `src/core` – `VoiceEngine`, `ActionDispatcher`, and event helpers
- `src/hooks` – React hooks such as `useVoiceAction`, `useVoiceActions`, and `useVoiceElement`
- `src/components` – ready-to-use UI like `<VoiceListener />`
- `src/services` – helpers such as the action cache
- `dist` – build output published to npm as `chant-sdk`

The project also ships with a companion app in `packages/app` that shows the SDK in action.

## Install and build
Chant expects React 16.8+ and TypeScript 5+.

```bash
# workspace root
bun install

# build the SDK once
cd packages/sdk
bun run build

# rebuild on change
bun run dev
```

You can swap `bun` with `npm`, `pnpm`, or `yarn` if you prefer another package manager.

## Voice engine basics

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

function LoginScreen() {
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
    label: "Email field",
    type: "input",
  });

  const passwordRef = useVoiceElement("login", {
    selector: "#password",
    label: "Password field",
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
      <LoginScreen />
      <VoiceListener />
    </VoiceEngineProvider>
  );
}
```

That is the smallest working setup:
- `VoiceEngine` holds state, talks to the model, and carries out DOM actions.
- `VoiceEngineProvider` places the engine in React context.
- `useVoiceAction` (or `useVoiceActions`) registers an action with its voice triggers and optional route.
- `useVoiceElement` links DOM nodes to the action so the engine knows where to click or type.
- `VoiceListener` renders the microphone button, status, and feedback UI.

## How action planning works
When a user speaks, the engine captures the audio, hands it to a Gemini model, and receives a plan. Each plan is a list of simple commands (`navigate`, `click`, `set_input_value`, `wait`, etc.). The engine then walks the plan, looks up the registered elements for the selected action, and interacts with the page using normal DOM calls. Execution state and voice state are published through events so hooks and UI can stay in sync.

## Describing actions in plain English
Chant leans on natural language to make actions easier to maintain.

```tsx
const SUPPORT_TICKET_ACTION = {
  actionId: "create-ticket",
  voice_triggers: [
    "create support ticket",
    "open a new ticket",
    "log an issue",
  ],
  description: "Open a new ticket and fill in the key details",
  steps: [
    "Click the create ticket button",
    "Fill the ticket title",
    "Fill the ticket description",
    "Select the priority",
    "Submit the ticket",
  ],
  route: "/tickets", // optional: only allow this on specific routes
};
```

Register many actions at once with `useVoiceActions([SUPPORT_TICKET_ACTION, ...])`.

### Informational actions
Actions without DOM steps can return information instead:

```tsx
const SHOW_HELP = {
  actionId: "show-help",
  voice_triggers: ["help", "what can I do"],
  description: "List the available voice actions",
  execFunction: () => ({
    resultText: "Here are the voice commands you can try",
    userInfo: ["Log in", "Add to cart", "Create ticket"],
    error: "",
  }),
};
```

### Route-aware actions
Provide a `route` string to make an action available only on certain screens. If you omit it, the action is treated as global.

## Registering elements
Each element registration links a real DOM node to an action. You can add metadata to help the model understand context.

```tsx
const productButtonRef = useVoiceElement("add-to-cart", {
  selector: `[data-product-id="${product.id}"]`,
  type: "button",
  label: `Add ${product.name} to cart`,
  metadata: {
    productName: product.name,
    productDescription: product.description,
    price: product.price,
  },
});
```

Attach the returned ref to the DOM node you render. When the component unmounts, the hook automatically unregisters the element.

### Optional demo handlers
For sensitive actions (checkout, payments, destructive updates), set `affectsPersistentState: true` and add a `demoHandler`. When the user says "demo" or "test", the handler runs instead of the real DOM action so you can show a safe preview.

```tsx
const checkoutRef = useVoiceElement("checkout", {
  selector: "#checkout-btn",
  type: "button",
  label: "Checkout",
  affectsPersistentState: true,
  demoHandler: async () => {
    await showDemoToast("Pretending to check out...");
  },
});
```

## Hooks at a glance
- `useVoiceAction` / `useVoiceActions` – register one or many actions.
- `useVoiceElement` – connect DOM nodes to an action.
- `useVoiceState` – read execution status and listener status.
- `useVoiceRecording`, `useVoiceActivityDetection`, `useAudioSession`, `useAudioProcessing` – lower-level hooks for audio control when you need customization.
- `useUserInfoDisplay` and `useActionSuccessFlow` – helpers for presenting feedback to end users.

## Components and services
- `<VoiceListener />` – drop-in UI for recording, playing prompts, and showing status.
- `VoiceEngineProvider` – context provider mentioned earlier.
- `ActionCacheService` – caches recent actions to improve follow-up requests.
- `EventBus` – singleton event dispatcher used internally and available if you need to listen to execution events outside React.

## Working with the demo app
Run the sample app in `packages/app` to see the SDK in context:

```bash
cd packages/app
bun run dev
```

Sign in with any email/password. The app shows three main flows:
- login form automation
- e-commerce add-to-cart and checkout
- support ticket creation with long-form input

Look at `packages/app/src/App.tsx` for real-world action definitions and element registrations.

## Tips for reliable actions
- Register actions and elements once per mount to avoid duplicates.
- Use stable selectors (`data-*` attributes) when possible.
- Provide friendly labels and useful metadata; the model uses them to pick the right element.
- Keep voice triggers short and conversational.
- If your app has routing, call `voiceEngine.setCurrentRoute(pathname)` whenever the location changes so route-specific actions behave as expected.

## Troubleshooting
- **Voice commands are ignored** – confirm `VITE_GEMINI_API_KEY` is set and the key is valid.
- **Elements cannot be found** – double-check selectors, and make sure the elements exist in the DOM when execution starts.
- **Actions stop midway** – inspect the browser console; the engine logs missing elements and failed steps.
- **Triggers feel too strict** – add more phrases or synonyms to `voice_triggers`, or add metadata that better describes the element.

## Useful scripts
```bash
# format: from workspace root
bun install

# SDK only
cd packages/sdk
bun run build     # build dist/ assets
bun run dev       # watch mode

# Publish steps (manual)
# 1. run bun run build
# 2. bump version in package.json
# 3. publish with your preferred registry tooling
```

## Need more?
Take a look at the source code inside `packages/sdk/src`. Each hook and core class is written in TypeScript with docs that explain intent. If you run into questions or discover a gap, open an issue or tweak the SDK—the code is meant to be easy to read and modify.
