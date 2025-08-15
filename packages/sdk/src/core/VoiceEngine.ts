import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";
import type {
  ActionElement,
  Action,
  ActionStep,
  ExecutionState,
  VoiceListenerState,
  ValidActionId,
  ExecFunctionResult,
  UserInfoDisplayEvent,
} from "../types";
import { ActionDispatcher } from "./ActionDispatcher";
import { ActionCacheService } from "../services/ActionCacheService";

export class VoiceEngine extends EventTarget {
  private elementsByAction = new Map<string, ActionElement[]>();
  private actions = new Map<string, Action>();
  private currentRoute = "/";
  private executionState: ExecutionState = {
    actionId: null,
    status: "idle",
    currentActionIndex: 0,
    pendingActions: [],
  };
  private voiceListenerState: VoiceListenerState = {
    status: "idle",
    transcript: "",
  };
  private actionCacheService = new ActionCacheService();

  getActionIds() {
    return Array.from(this.actions.keys());
  }

  getActions() {
    return this.actions;
  }

  getAllActions() {
    return Array.from(this.actions.values());
  }

  constructor() {
    super();
  }

  // State management
  getExecutionState(): ExecutionState {
    return { ...this.executionState };
  }

  getVoiceListenerState(): VoiceListenerState {
    return { ...this.voiceListenerState };
  }

  updateExecutionState(updates: Partial<ExecutionState>) {
    this.executionState = { ...this.executionState, ...updates };
    this.dispatchEvent(
      new CustomEvent("executionStateChange", {
        detail: { ...this.executionState },
      })
    );
  }

  updateVoiceListenerState(updates: Partial<VoiceListenerState>) {
    this.voiceListenerState = { ...this.voiceListenerState, ...updates };
    this.dispatchEvent(
      new CustomEvent("voiceListenerStateChange", {
        detail: { ...this.voiceListenerState },
      })
    );
  }

  resumeExecution() {
    if (
      this.executionState.status === "paused" &&
      this.executionState.pendingActions.length > 0
    ) {
      this.updateExecutionState({
        status: "executing",
        waitingForElement: undefined,
      });
      this.executeActionsInternal(
        this.executionState.actionId!,
        this.executionState.pendingActions
      );
    }
  }

  private async executeActionsInternal(
    actionId: string,
    actions: ActionStep[]
  ) {
    this.updateExecutionState({
      status: "executing",
      currentActionIndex: 0,
      pendingActions: actions,
      actionId: actionId,
    });

    const elements = new Map<string, ActionElement>(
      (this.elementsByAction.get(actionId) ?? []).map((element) => [
        element.id,
        element,
      ])
    );

    const actionDispatcher = new ActionDispatcher(elements, this, () => this.getExecutionState());
    await actionDispatcher.executeActions(actions);
  }

  // Execute informational function
  private async executeInformationalFunction(action: Action): Promise<void> {
    if (!action.execFunction) return;

    try {
      const result = await this.executeWithTimeout(action.execFunction, 5000);

      // Dispatch user info display event
      this.dispatchEvent(
        new CustomEvent("userInfoDisplay", {
          detail: {
            actionId: action.actionId,
            resultText: result.resultText,
            userInfo: result.userInfo || [],
            error: result.error
          } satisfies UserInfoDisplayEvent
        })
      );
    } catch (error) {
      this.dispatchEvent(
        new CustomEvent("userInfoDisplay", {
          detail: {
            actionId: action.actionId,
            resultText: '',
            userInfo: [],
            error: error instanceof Error ? error.message : 'Unknown error'
          } satisfies UserInfoDisplayEvent
        })
      );
    }
  }

  private executeWithTimeout<T>(fn: () => T | Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      Promise.resolve(fn()),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Function timeout')), timeout)
      )
    ]);
  }

  // Registration methods
  registerElement(actionId: ValidActionId, actionElement: ActionElement) {
    this.elementsByAction.set(actionId, [
      ...(this.elementsByAction.get(actionId) || []),
      actionElement,
    ]);
  }

  registerAction(action: Action) {
    if (this.actions.has(action.actionId)) {
      throw new Error(
        `Action with ID '${action.actionId}' is already registered`
      );
    }
    this.actions.set(action.actionId, action);
  }

  unregisterActions() {
    this.actions.clear();
  }

  unregisterElement(
    actionId: ValidActionId,
    element: Pick<ActionElement, "id">
  ) {
    const elements = this.elementsByAction.get(actionId);
    if (!elements) return;

    const index = elements.findIndex((el) => el.id === element.id);
    if (index != -1) {
      elements.splice(index, 1);
    }
  }

  setCurrentRoute(route: string) {
    this.currentRoute = route;
  }

  getCurrentRoute(): string {
    return this.currentRoute;
  }

  getAvailableActionsForCurrentRoute(): Action[] {
    const routeSpecificActions: Action[] = [];
    const globalActions: Action[] = [];

    for (const action of this.actions.values()) {
      if (action.route && action.route === this.currentRoute) {
        routeSpecificActions.push(action);
      } else if (!action.route) {
        globalActions.push(action);
      }
    }

    return routeSpecificActions.length > 0
      ? routeSpecificActions
      : globalActions;
  }

  hasActionsForCurrentRoute(): boolean {
    return this.getAvailableActionsForCurrentRoute().length > 0;
  }

  // Multimodal intent resolution using audio
  private async resolveIntentFromAudio(
    audioBase64: string
  ): Promise<{ actionId: string | null; transcription: string; isDemoMode?: boolean }> {
    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      throw new Error("VITE_GEMINI_API_KEY environment variable is required");
    }

    const availableActions = this.getAllActions();
    if (availableActions.length === 0) {
      return { actionId: null, transcription: "" };
    }

    // Create a structured representation of available actions for the prompt
    const actionsForPrompt = availableActions.map((action) => ({
      id: action.actionId,
      description: action.description,
      voice_triggers: action.voice_triggers,
      steps: action.steps,
    }));

    const prompt = `You are an intelligent voice command matcher. Listen to the audio, transcribe it, and determine which action the user wants to perform.

Available actions:
${JSON.stringify(actionsForPrompt, null, 2)}

Instructions:
1. Listen carefully to the audio and transcribe what is said
2. Match the spoken content to the most suitable action based on:
   - Voice triggers (exact or similar phrases)
   - Action descriptions
   - Overall intent
3. Return ONLY the action ID if there's a confident match (confidence > 70%)
4. Return null if no action matches well enough or if you're not confident
5. Detect if the user wants to run the action in demo mode by listening for keywords like:
   - "demo", "test", "try", "simulate", "preview", "show me"
   - "don't actually", "fake", "practice", "just show"

Response format: Return a JSON object with transcription, action ID, and demo mode flag:
{"transcription": "what the user said", "actionId": "action-id-or-null", "isDemoMode": false}
Examples: 
{"transcription": "login to my account", "actionId": "login", "isDemoMode": false}
{"transcription": "demo the login process", "actionId": "login", "isDemoMode": true}
{"transcription": "show me how to place an order", "actionId": "place-order", "isDemoMode": true}
{"transcription": "hello there", "actionId": null, "isDemoMode": false}`;

    try {
      const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          createUserContent([
            prompt,
            { inlineData: { mimeType: "audio/wav", data: audioBase64 } },
          ]),
        ],
        config: { responseMimeType: "application/json" },
      });

      const result = response.text?.trim();
      console.log("Gemini multimodal response:", result);

      if (!result) {
        return { actionId: null, transcription: "", isDemoMode: false };
      }

      try {
        const parsed = JSON.parse(result);
        const transcription = parsed.transcription || "";
        let actionId = parsed.actionId;
        const isDemoMode = parsed.isDemoMode || false;

        // Handle null/none cases
        if (
          !actionId ||
          actionId.toLowerCase() === "null" ||
          actionId.toLowerCase() === "none"
        ) {
          return { actionId: null, transcription, isDemoMode };
        }

        // Verify the returned action ID exists in our available actions
        const actionExists = availableActions.some(
          (action) => action.actionId === actionId
        );
        if (!actionExists) {
          console.warn(`Gemini returned invalid action ID: ${actionId}`);
          return { actionId: null, transcription, isDemoMode };
        }

        return { actionId, transcription, isDemoMode };
      } catch (parseError) {
        console.error("Failed to parse Gemini JSON response:", result);
        return { actionId: null, transcription: "", isDemoMode: false };
      }
    } catch (error) {
      console.error("Error in multimodal intent resolution:", error);
      return { actionId: null, transcription: "", isDemoMode: false };
    }
  }

  // Legacy intent resolution using transcript (keeping as fallback)
  private resolveIntent(transcript: string): string | undefined {
    console.log("Resolving intent for transcript:", transcript);
    console.log("Available actions:", Array.from(this.actions.keys()));
    console.log("Current route:", this.currentRoute);

    // First pass: look for actions registered for the current route
    const routeSpecificActions: [string, Action][] = [];
    const globalActions: [string, Action][] = [];

    for (const [id, action] of this.actions.entries()) {
      if (action.route && action.route === this.currentRoute) {
        routeSpecificActions.push([id, action]);
      } else if (!action.route) {
        globalActions.push([id, action]);
      }
    }

    console.log(
      "Route-specific actions:",
      routeSpecificActions.map(([id]) => id)
    );
    console.log(
      "Global actions:",
      globalActions.map(([id]) => id)
    );

    // First try to match route-specific actions
    for (const [id, action] of routeSpecificActions) {
      console.log(
        `Checking route-specific action ${id} with triggers:`,
        action.voice_triggers
      );
      if (
        action.voice_triggers.some((t) =>
          transcript.toLowerCase().includes(t.toLowerCase())
        )
      ) {
        console.log(`Route-specific match found: ${id}`);
        return id;
      }
    }

    // Then try global actions if no route-specific match found
    for (const [id, action] of globalActions) {
      console.log(
        `Checking global action ${id} with triggers:`,
        action.voice_triggers
      );
      if (
        action.voice_triggers.some((t) =>
          transcript.toLowerCase().includes(t.toLowerCase())
        )
      ) {
        console.log(`Global match found: ${id}`);
        return id;
      }
    }

    console.log("No matching action found");
    return undefined;
  }

  // Transcription
  async transcribeAudio(audioBase64: string): Promise<string> {
    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      throw new Error("VITE_GEMINI_API_KEY environment variable is required");
    }

    const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          text: "Please transcribe this audio to text. Return only the transcribed text, no other formatting or explanation.",
        },
        { inlineData: { mimeType: "audio/wav", data: audioBase64 } },
      ],
    });

    const transcript = response.text;

    if (!transcript) {
      throw new Error("No transcription received from Gemini API");
    }

    return transcript.trim().toLowerCase();
  }

  // Public methods for updating voice listener state
  setListening(isListening: boolean) {
    this.updateVoiceListenerState({
      status: isListening ? "listening" : "idle",
    });
  }

  setSpeaking(isSpeaking: boolean) {
    this.updateVoiceListenerState({
      status: isSpeaking ? "speaking" : "idle",
    });
  }

  setTranscript(transcript: string) {
    this.updateVoiceListenerState({ transcript });
  }

  // Action generation
  private async generateActions(
    actionId: string,
    transcript: string
  ): Promise<ActionStep[]> {
    const action = this.actions.get(actionId);

    // Check for cached actions first
    try {
      const cachedActions = await this.actionCacheService.findCachedSteps(actionId, transcript);
      if (cachedActions.length > 0) {
        console.log("Found cached actions for", actionId, ":", cachedActions[0].steps);
        return cachedActions[0].steps;
      }
    } catch (error) {
      console.warn("Error checking cached actions:", error);
    }

    // Get elements specifically registered for this action
    const actionElements = this.elementsByAction.get(actionId);
    const elementsData = actionElements
      ? Array.from(actionElements.values()).map((el) => ({
        id: el.id,
        type: el.type,
        label: el.label,
        selector: el.selector,
        metadata: el.metadata || {},
        affectsPersistentState: el.affectsPersistentState || false,
        hasDemoHandler: !!el.demoHandler,
        value: el.ref?.current
          ? (el.ref.current as HTMLInputElement).value || ""
          : "",
      }))
      : [];

    console.log("action elements", actionElements);
    const prompt = `
You are a voice automation assistant. Generate a JSON array of actions to accomplish the user's voice command by selecting the MOST RELEVANT element(s) based on the command and element metadata.

Voice command: "${transcript}"
Action description: "${action?.description}"
Steps: ${action?.steps?.join(", ")}
Available elements: ${JSON.stringify(elementsData, null, 2)}

CRITICAL REQUIREMENTS:
1. ANALYZE the voice command to identify the specific target (e.g., product name, item description)
2. MATCH the command with the most relevant element using:
   - Element metadata (productTitle, productDescription, etc.)
   - Element labels
   - Semantic similarity between command and element data
3. Generate actions ONLY for the matched element(s) - do NOT generate actions for every element
4. For setValue actions, extract values from the voice command or use contextually appropriate defaults
5. Generate actions in logical execution order

Element matching strategy:
- If voice command mentions a specific product/item, match it to the element with corresponding metadata
- Use fuzzy matching for product names (e.g., "smart headphones" matches "Wireless Headphones")
- Consider synonyms and partial matches in product descriptions
- Only generate actions for the best matching element(s)

Element analysis:
${elementsData
        .map(
          (el) =>
            `- ${el.id} (${el.type}): "${el.label}"
  Metadata: ${JSON.stringify(el.metadata)}
  Current value: "${el.value}"
  Affects persistent state: ${el.affectsPersistentState}
  Has demo handler: ${el.hasDemoHandler}`
        )
        .join("\n")}

Examples of matching:
- Command: "add smart headphones to cart" → Match element with metadata.productTitle containing "headphones"
- Command: "buy bluetooth speaker" → Match element with metadata containing "speaker" or "bluetooth"
- Command: "get laptop stand" → Match element with metadata containing "laptop" and "stand"

Return ONLY a JSON array of actions for the MATCHED element(s):
[
  {"type": "click", "elementId": "matched-element-id"}
]

IMPORTANT: If an element has "affectsPersistentState: true", include it in the action generation but note this information. Elements that affect persistent state may need special handling during execution.

Supported action types: setValue, click, focus, wait, navigate

REMEMBER: Only generate actions for elements that match the voice command. Do not generate actions for unrelated elements.
`;

    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      throw new Error("VITE_GEMINI_API_KEY environment variable is required");
    }

    const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const generatedText = response.text;

    if (!generatedText) {
      throw new Error("No response from Gemini API");
    }

    try {
      const cleanedText = generatedText
        .replace(/```json\n?|\n?```/g, "")
        .trim();

      const actions = JSON.parse(cleanedText);

      // Validate and fix the generated actions
      const validatedActions = this.validateAndFixActions(
        actions,
        elementsData,
        transcript
      );

      return validatedActions;
    } catch (e) {
      console.error("Failed to parse Gemini response:", generatedText);
      throw new Error("Invalid JSON response from Gemini API");
    }
  }

  private validateAndFixActions(
    actions: ActionStep[],
    elementsData: any[],
    transcript: string
  ): ActionStep[] {
    const validatedActions: ActionStep[] = [];

    // Process and validate generated actions
    for (const action of actions) {
      if (!action.type || !action.elementId) continue;

      // Verify the elementId exists in available elements
      const element = elementsData.find((el) => el.id === action.elementId);
      if (!element) {
        console.warn(`Action references non-existent element: ${action.elementId}`);
        continue;
      }

      // Fix setValue actions with null/empty values
      if (
        action.type === "setValue" &&
        (!action.value || action.value.trim() === "" || action.value === "null")
      ) {
        action.value = this.generateFallbackValue(element, transcript);
      }

      validatedActions.push(action);
    }

    // If no valid actions were generated, this might indicate no good match was found
    if (validatedActions.length === 0) {
      console.warn("No valid actions generated for voice command:", transcript);
    }

    return validatedActions;
  }


  private generateFallbackValue(element: any, transcript: string): string {
    const label = element.label?.toLowerCase() || "";
    const id = element.id?.toLowerCase() || "";
    const transcriptLower = transcript.toLowerCase();

    // Try to extract value from transcript first
    if (label.includes("email") || id.includes("email")) {
      const emailMatch = transcriptLower.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch) return emailMatch[0];
      return "user@example.com";
    }

    if (label.includes("password") || id.includes("password")) {
      return "password123";
    }

    if (label.includes("name") || id.includes("name")) {
      // Try to extract name from transcript
      const nameMatch = transcriptLower.match(
        /(?:my name is|i am|call me)\s+([a-z]+(?:\s+[a-z]+)?)/
      );
      if (nameMatch) return nameMatch[1];

      if (label.includes("first") || id.includes("first")) return "John";
      if (label.includes("last") || id.includes("last")) return "Doe";
      return "John Doe";
    }

    if (label.includes("phone") || id.includes("phone")) {
      const phoneMatch = transcriptLower.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/);
      if (phoneMatch) return phoneMatch[0];
      return "+1234567890";
    }

    if (label.includes("address") || id.includes("address")) {
      return "123 Main St";
    }

    if (label.includes("city") || id.includes("city")) {
      return "New York";
    }

    if (
      label.includes("zip") ||
      id.includes("zip") ||
      label.includes("postal")
    ) {
      return "10001";
    }

    if (label.includes("age") || id.includes("age")) {
      const ageMatch = transcriptLower.match(
        /\b(\d{1,3})\s*(?:years?\s*old|year|age)/
      );
      if (ageMatch) return ageMatch[1];
      return "25";
    }

    // Generic fallback based on element type
    if (element.type === "email") return "user@example.com";
    if (element.type === "tel") return "+1234567890";
    if (element.type === "number") return "1";
    if (element.type === "date") return new Date().toISOString().split("T")[0];

    // Last resort: return a generic meaningful value
    return "Sample Value";
  }

  // Main audio handling (new multimodal approach)
  async handleAudio(audioBase64: string) {
    console.log("handleAudio called with audio data");

    this.updateVoiceListenerState({ status: "analyzing" });

    // Check for resume commands when paused (still use transcription for this)
    if (this.executionState.status === "paused") {
      try {
        const transcript = await this.transcribeAudio(audioBase64);
        const resumeCommands = ["continue", "next", "resume", "proceed"];
        if (
          resumeCommands.some((cmd) => transcript.toLowerCase().includes(cmd))
        ) {
          this.resumeExecution();
          return;
        }
      } catch (error) {
        console.error("Error transcribing audio for resume check:", error);
      }
    }

    // Use multimodal intent resolution
    try {
      const result = await this.resolveIntentFromAudio(audioBase64);
      this.updateVoiceListenerState({ transcript: result.transcription });

      if (!result.actionId) {
        console.log(
          "No action ID found from multimodal analysis, returning early"
        );
        console.log("Transcription:", result.transcription);

        // Emit no match warning event
        this.dispatchEvent(
          new CustomEvent("noMatchWarning", {
            detail: { transcript: result.transcription }
          })
        );

        this.updateVoiceListenerState({ status: "listening", transcript: "" });
        return;
      }

      console.log("Multimodal analysis found actionId:", result.actionId);
      console.log("Transcription:", result.transcription);

      const action = this.actions.get(result.actionId);
      if (!action) {
        console.log("Action not found:", result.actionId);
        this.updateVoiceListenerState({ status: "listening", transcript: "" });
        return;
      }

      // Check if this action has an execFunction - if so, execute directly
      if (action.execFunction) {
        console.log("Executing informational function for action:", result.actionId);
        await this.executeInformationalFunction(action);
        this.updateVoiceListenerState({ status: "idle", transcript: "" });
        return;
      }

      // Check if there are registered elements for this action (for regular actions)
      const actionElements = this.elementsByAction.get(result.actionId);
      if (!actionElements || actionElements.length === 0) {
        console.log("No elements registered for action:", result.actionId);

        // Emit no elements warning event
        this.dispatchEvent(
          new CustomEvent("noElementsWarning", {
            detail: { actionId: result.actionId, transcript: result.transcription }
          })
        );

        this.updateVoiceListenerState({ status: "listening", transcript: "" });
        return;
      }

      this.updateVoiceListenerState({ status: "planning" });
      console.log("Generating actions for actionId:", result.actionId);
      console.log("Demo mode:", result.isDemoMode);

      const actions = await this.generateActions(
        result.actionId,
        result.transcription
      );
      console.log("Generated actions:", actions);

      // Set demo mode in execution state
      this.updateExecutionState({ isDemoMode: result.isDemoMode });

      this.updateVoiceListenerState({ status: "idle" });
      await this.executeActionsInternal(result.actionId, actions);
      console.log("Actions executed successfully");
    } catch (error) {
      console.error("Error handling audio:", error);
      this.updateVoiceListenerState({ status: "idle" });
    }
  }

  // Legacy transcript handling (keeping for backward compatibility)
  async handleTranscript(transcript: string) {
    console.log("handleTranscript called with:", transcript);

    // Check for resume commands when paused
    if (this.executionState.status === "paused") {
      const resumeCommands = ["continue", "next", "resume", "proceed"];
      if (
        resumeCommands.some((cmd) => transcript.toLowerCase().includes(cmd))
      ) {
        this.resumeExecution();
        return;
      }
    }

    const actionId = this.resolveIntent(transcript);

    if (!actionId) {
      console.log("No action ID found, returning early");

      // Emit no match warning event
      this.dispatchEvent(
        new CustomEvent("noMatchWarning", {
          detail: { transcript }
        })
      );

      return;
    }

    const action = this.actions.get(actionId);
    if (!action) {
      console.log("Action not found:", actionId);
      return;
    }

    // Check if this action has an execFunction - if so, execute directly
    if (action.execFunction) {
      console.log("Executing informational function for action:", actionId);
      await this.executeInformationalFunction(action);
      return;
    }

    console.log("Generating actions for actionId:", actionId);
    try {
      // Check if there are registered elements for this action
      const actionElements = this.elementsByAction.get(actionId);
      if (!actionElements || actionElements.length === 0) {
        console.log("No elements registered for action:", actionId);

        // Emit no elements warning event
        this.dispatchEvent(
          new CustomEvent("noElementsWarning", {
            detail: { actionId, transcript }
          })
        );

        return;
      }

      const actions = await this.generateActions(actionId, transcript);
      console.log("Generated actions:", actions);
      await this.executeActionsInternal(actionId, actions);
      console.log("Actions executed successfully");
    } catch (e) {
      console.error("Error handling transcript:", e);
    }
  }
}
