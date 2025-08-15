# Chant SDK 🎙️

**A React SDK for voice-controlled web automation that actually works**

Transform any React app into a voice-controlled powerhouse. No more clicking through endless forms or hunting for buttons—just speak your intentions and watch the magic happen.

## Table of Contents

- [What Makes This Special](#what-makes-this-special)
- [Core Components](#core-components)
- [Quick Start](#quick-start)
- [Voice Actions](#voice-actions)
- [Element Registration](#element-registration)
- [Advanced Features](#advanced-features)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## What Makes This Special

Unlike other voice SDKs that just transcribe speech, Chant SDK understands **intent** and **context**. It uses Google's Gemini AI to:

- **Intelligently match** voice commands to actions based on context
- **Find the right elements** on your page using semantic understanding
- **Handle complex workflows** with multi-step action execution
- **Provide smart fallbacks** when things don't go as planned

Think of it as having an AI assistant that actually knows how to use your app.

## Core Components

### 🎯 VoiceEngine
The brains of the operation. Handles multimodal intent resolution, action generation, and execution orchestration.

**Why it's awesome:** Uses audio analysis (not just transcription) to understand user intent with 70%+ confidence matching.

### 🎭 ActionDispatcher  
Your reliable execution companion. Manages action sequences, handles pausing/resuming, and deals with demo mode.

**Why you need it:** Ensures actions execute in the right order and handles edge cases like missing elements or validation errors.

### 🎤 VoiceListener
The sleek UI component that users interact with. Provides visual feedback and handles all recording states.

**Why it's polished:** Animated state transitions, contextual information display, and built-in error handling.

### 🔗 Voice Hooks
React hooks that make integration seamless:
- `useVoiceElement` - Register any DOM element for voice control
- `useVoiceActions` - Define and manage voice actions
- `useVoiceState` - Access current voice system state

## Quick Start

### Installation

```bash
bun install chant-sdk
```

### Environment Setup

Add your Gemini API key to your environment:

```bash
# .env
VITE_GEMINI_API_KEY=your_api_key_here
```

### Basic Integration

```tsx
import { VoiceListener, useVoiceActions, useVoiceElement } from 'chant-sdk';

function LoginForm() {
  // Define what voice commands can do
  const loginAction = {
    actionId: 'login',
    voice_triggers: ['log in', 'sign in', 'authenticate'],
    description: 'Login with credentials',
    steps: ['Fill email', 'Fill password', 'Click login']
  };

  useVoiceActions([loginAction]);

  // Register elements for voice control
  const emailRef = useVoiceElement('login', {
    selector: '#email',
    type: 'input',
    label: 'Email field'
  });

  const passwordRef = useVoiceElement('login', {
    selector: '#password', 
    type: 'input',
    label: 'Password field'
  });

  const submitRef = useVoiceElement('login', {
    selector: '#login-btn',
    type: 'button', 
    label: 'Login button'
  });

  return (
    <div>
      <input ref={emailRef} id="email" type="email" />
      <input ref={passwordRef} id="password" type="password" />
      <button ref={submitRef} id="login-btn">Login</button>
      
      {/* Add the voice interface */}
      <VoiceListener />
    </div>
  );
}
```

That's it! Users can now say "log in" and the SDK will automatically fill the form and submit it.

## Voice Actions

Voice actions are the heart of the SDK. They define what users can say and what should happen.

### Basic Action Structure

```tsx
const action = {
  actionId: 'unique-id',
  voice_triggers: ['add to cart', 'buy this', 'purchase'],
  description: 'Add product to shopping cart',
  steps: ['Find product', 'Click add to cart button'],
  route: '/products' // Optional: restrict to specific routes
};
```

### Smart Product Selection

The SDK can intelligently match voice commands to specific products:

```tsx
// Say "add wireless headphones to cart"
// SDK automatically finds the right product button
const productRef = useVoiceElement('add-to-cart', {
  selector: `[data-product="${product.id}"]`,
  type: 'button',
  label: `Add ${product.name} to cart`,
  metadata: {
    productTitle: product.name,
    productDescription: product.description
  }
});
```

### Informational Actions

Create actions that provide information instead of clicking things:

```tsx
const helpAction = {
  actionId: 'show-help',
  voice_triggers: ['help', 'what can I do', 'show commands'],
  description: 'Show available voice commands',
  execFunction: () => ({
    resultText: 'Here are the available commands',
    userInfo: ['Login', 'Add to cart', 'Create ticket'],
    error: ''
  })
};
```

## Element Registration

### Basic Registration

```tsx
const buttonRef = useVoiceElement(actionId, {
  selector: '#my-button',
  type: 'button',
  label: 'Submit form'
});
```

### Advanced Registration with Metadata

```tsx
const productButtonRef = useVoiceElement('add-to-cart', {
  selector: `[data-product="${product.id}"]`,
  type: 'button', 
  label: `Add ${product.title} to cart`,
  metadata: {
    productTitle: product.title,
    productDescription: product.description,
    price: product.price
  }
});
```

### Demo Mode Support

For elements that affect persistent state (like payments), provide demo handlers:

```tsx
const checkoutRef = useVoiceElement('checkout', {
  selector: '#checkout-btn',
  type: 'button',
  label: 'Checkout button',
  affectsPersistentState: true,
  demoHandler: async () => {
    // Show fake payment success instead of charging real money
    showDemoPaymentSuccess();
  }
});
```

## Advanced Features

### Route-Specific Actions

Actions can be tied to specific app routes:

```tsx
const actions = [
  {
    actionId: 'login',
    voice_triggers: ['log in'],
    description: 'Login to account',
    route: '/' // Only available on home page
  },
  {
    actionId: 'global-help',
    voice_triggers: ['help'],
    description: 'Show help',
    // No route = available everywhere
  }
];
```

### Multi-Step Workflows

The SDK handles complex workflows automatically:

```tsx
const ticketAction = {
  actionId: 'create-ticket',
  voice_triggers: ['create ticket', 'new support ticket'],
  description: 'Create a support ticket',
  steps: [
    'Click create ticket button',
    'Fill ticket title', 
    'Fill description',
    'Select priority',
    'Submit ticket'
  ]
};
```

### State Management

Access the current voice system state:

```tsx
import { useVoiceState } from 'chant-sdk';

function MyComponent() {
  const { executionState, voiceListenerState } = useVoiceState();
  
  if (executionState.status === 'executing') {
    return <div>Voice command in progress...</div>;
  }
}
```

### Demo Mode

Users can try actions without side effects by saying "demo" or "test":

```tsx
// User says: "demo the checkout process"
// SDK executes in demo mode, calling demoHandler instead of real actions
```

## API Reference

### Hooks

#### `useVoiceActions(actions: Action[])`
Register voice actions with the system.

#### `useVoiceElement(actionId: string, config: ElementConfig)`
Register a DOM element for voice control.

#### `useVoiceState()`
Access current voice system state.

### Components

#### `<VoiceListener />`
The main voice interface component. Include once in your app.

### Types

```tsx
interface Action {
  actionId: string;
  voice_triggers: string[];
  description: string; 
  steps?: string[];
  route?: string;
  execFunction?: () => ExecFunctionResult | Promise<ExecFunctionResult>;
}

interface ElementConfig {
  selector: string;
  type: string;
  label: string;
  metadata?: Record<string, any>;
  affectsPersistentState?: boolean;
  demoHandler?: () => void | Promise<void>;
}
```

## Examples

### E-commerce Store

```tsx
// Voice command: "add wireless headphones to cart"
const productButtons = products.map(product => 
  useVoiceElement('add-to-cart', {
    selector: `[data-product="${product.id}"]`,
    type: 'button',
    label: `Add ${product.title} to cart`,
    metadata: {
      productTitle: product.title,
      productDescription: product.description
    }
  })
);
```

### Form Automation

```tsx
// Voice command: "create support ticket"
const titleRef = useVoiceElement('create-ticket', {
  selector: '#ticket-title',
  type: 'input', 
  label: 'Ticket title'
});

const descRef = useVoiceElement('create-ticket', {
  selector: '#ticket-description',
  type: 'textarea',
  label: 'Ticket description'  
});
```

### Multi-Page Actions

```tsx
const actions = [
  {
    actionId: 'dashboard-summary',
    voice_triggers: ['show dashboard', 'summary'],
    description: 'Navigate to dashboard',
    route: '/dashboard'
  },
  {
    actionId: 'help',
    voice_triggers: ['help', 'what can I do'],
    description: 'Show available commands'
    // Available on all routes
  }
];
```

## Troubleshooting

### Common Issues

**Voice commands not recognized?**
- Check your `VITE_GEMINI_API_KEY` is set correctly
- Ensure voice triggers match user's natural language
- Verify actions are registered with `useVoiceActions`

**Elements not found?**  
- Confirm selectors match actual DOM elements
- Check if elements exist when voice action runs
- Verify `ref` is properly attached to DOM elements

**Actions not executing?**
- Check browser console for errors
- Ensure elements are registered for the correct `actionId`
- Verify route-specific actions match current URL

### Performance Tips

- Register actions once, not on every render
- Use specific selectors to avoid element conflicts  
- Implement demo handlers for persistent state actions
- Test voice commands with various phrasings

---

**Ready to give your users superpowers?** Install Chant SDK and transform boring clicks into magical voice commands. Your users will thank you (probably out loud). 🎉
