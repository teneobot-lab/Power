import { GoogleGenAI } from "@google/genai";
import { InventoryItem } from "../types";

declare var process: {
  env: {
    API_KEY?: string;
  }
};

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
  const finalKey = process.env.API_KEY || apiKey;
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
        Act as a Warehouse Inventory Analyst in Indonesia. Analyze the following inventory data in JSON format:
        ${inventoryData}

        Provide a concise executive summary (max 300 words) that covers:
        1. Overall stock health (Are we overstocked/understocked?).
        2. Identify top 3 items that need immediate attention (reorder or liquidation).
        3. A quick financial valuation summary using Rupiah (Rp).
        
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
  apiKey?: string
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
          You are "SmartStock Agent", a highly intelligent AI assistant for an Indonesian warehouse manager.

          **YOUR CAPABILITIES:**
          1. **General Intelligence:** Answer questions, solve problems, write emails, or chat casually.
          2. **Inventory Expert:** Use the provided real-time warehouse inventory data.

          **CURRENT INVENTORY CONTEXT (JSON):**
          ${inventoryData}
          
          **GUIDELINES:**
          - If the user asks about stock or value, strictly use the JSON data provided.
          - ALWAYS format currency in Indonesian Rupiah (Rp) and use thousand separators (e.g., Rp 10.000).
          - Be professional, concise, and helpful.
          - Use Indonesian or English as requested by the user.
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
