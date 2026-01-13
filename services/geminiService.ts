import { GoogleGenAI } from "@google/genai";
import { InventoryItem } from "../types";

// Helper to format inventory for the model to understand
const formatInventoryContext = (items: InventoryItem[]): string => {
  return JSON.stringify(items.map(item => ({
    name: item.name,
    sku: item.sku,
    qty: item.quantity,
    min: item.minLevel,
    price: item.unitPrice,
    val: item.quantity * item.unitPrice,
    cat: item.category,
    loc: item.location
  })));
};

// Helper to get AI Client safely
const getClient = (apiKey?: string) => {
  // Prioritize the key passed from App Settings (Admin Panel)
  // We use a safe check for process.env to avoid "ReferenceError" in some browser environments
  let finalKey = apiKey;

  // Fallback to process.env if available (for development/deployment later)
  if (!finalKey && typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    finalKey = process.env.API_KEY;
  }

  if (!finalKey) return null;
  return new GoogleGenAI({ apiKey: finalKey });
};

export const getInventoryInsights = async (items: InventoryItem[], apiKey?: string): Promise<string> => {
  try {
    const ai = getClient(apiKey);
    
    if (!ai) {
      return "⚠️ API Key is missing. Please go to **Admin Panel > System Settings** and enter your Google Gemini API Key.";
    }
    
    const inventoryData = formatInventoryContext(items);
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        Act as a Warehouse Inventory Analyst. Analyze the following inventory data in JSON format:
        ${inventoryData}

        Provide a concise executive summary (max 300 words) that covers:
        1. Overall stock health (Are we overstocked/understocked?).
        2. Identify top 3 items that need immediate attention (reorder or liquidation).
        3. A quick financial valuation summary.
        
        Format the output as clean Markdown.
      `,
    });

    return response.text || "No insights generated.";
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return "Failed to generate insights. Please check if your API Key is valid in the Admin Panel.";
  }
};

export const chatWithInventoryBot = async (
  query: string, 
  items: InventoryItem[], 
  apiKey?: string,
  history: {role: string, parts: {text: string}[]}[] = []
): Promise<string> => {
  try {
    const ai = getClient(apiKey);

    if (!ai) {
      return "I cannot reply because the API Key is missing. Please configure it in the Admin Panel.";
    }

    const inventoryData = formatInventoryContext(items);
    
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `
          You are "SmartStock Agent", a highly intelligent and capable AI assistant for a warehouse manager.

          **YOUR CAPABILITIES:**
          1. **General Intelligence:** You can answer general questions, solve math problems, write professional emails to suppliers, explain concepts, writes code, or chat casually. You are NOT limited to inventory topics.
          2. **Inventory Expert:** You have real-time access to the warehouse inventory data provided below. When the user asks about stock, prices, or locations, USE this data to be accurate.

          **CURRENT INVENTORY CONTEXT (JSON):**
          ${inventoryData}
          
          **GUIDELINES:**
          - If the user asks about "stock", "quantities", "value", or "items", strictly use the JSON data provided above.
          - If the user asks to "Write an email to a supplier" or "Calculate potential profit markup", use your general capabilities.
          - If the user asks general questions (e.g., "What is the capital of France?", "Help me debug this Python code"), answer them helpfully using your general training.
          - Be professional, concise, and helpful.
          - Format currency in USD.
        `,
      },
    });

    const response = await chat.sendMessage({ message: query });
    return response.text || "I didn't catch that.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Sorry, I'm having trouble connecting. Please verify your API Key in the Admin Panel.";
  }
};