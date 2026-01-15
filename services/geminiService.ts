
import { GoogleGenAI } from "@google/genai";
import { InventoryItem } from "../types";

// Ensure process.env exists in the browser scope to prevent crashes
const getApiKey = () => {
  try {
    return (window as any).process?.env?.API_KEY || "";
  } catch {
    return "";
  }
};

// Initialize AI client using the SDK-required pattern
const ai = new GoogleGenAI({ apiKey: getApiKey() });

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

/**
 * Generates inventory insights using the Gemini 3 Flash model.
 */
export const getInventoryInsights = async (items: InventoryItem[]): Promise<string> => {
  try {
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
    return "Failed to generate insights. Check if your API key is correctly configured.";
  }
};

/**
 * Facilitates a chat session with the "SmartStock Agent".
 */
export const chatWithInventoryBot = async (
  query: string, 
  items: InventoryItem[]
): Promise<string> => {
  try {
    const inventoryData = formatInventoryContext(items);
    
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `
          You are "SmartStock Agent", a highly intelligent AI assistant for a warehouse manager.

          **YOUR CAPABILITIES:**
          1. **General Intelligence:** You can answer general questions, solve math, write emails, or chat casually.
          2. **Inventory Expert:** Use the warehouse inventory data provided below to answer specific stock queries.

          **CURRENT INVENTORY CONTEXT (JSON):**
          ${inventoryData}
          
          **GUIDELINES:**
          - Strictly use the provided JSON for stock counts or values.
          - Be professional, concise, and helpful.
          - Format currency in USD.
        `,
      },
    });

    const response = await chat.sendMessage({ message: query });
    return response.text || "I didn't catch that.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Sorry, I'm having trouble connecting to the AI service.";
  }
};
