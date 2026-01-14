import { GoogleGenAI } from "@google/genai";
import { InventoryItem } from "../types";

declare var process: {
  env: {
    API_KEY?: string;
  }
};

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

const getClient = (apiKey?: string) => {
  const finalKey = process.env.API_KEY || apiKey;
  if (!finalKey) return null;
  return new GoogleGenAI({ apiKey: finalKey });
};

export const getInventoryInsights = async (items: InventoryItem[], apiKey?: string): Promise<string> => {
  try {
    const ai = getClient(apiKey);
    if (!ai) return "⚠️ API Key is missing. Please go to **Admin Panel > System Settings** and enter your Google Gemini API Key.";
    const inventoryData = formatInventoryContext(items);
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        Act as a Warehouse Inventory Analyst in Indonesia. Analyze the following inventory data in JSON format:
        ${inventoryData}

        Provide a concise executive summary (max 300 words) that covers:
        1. Overall stock health (Are we overstocked/understocked?).
        2. Identify top 3 items that need immediate attention (reorder or liquidation).
        3. A quick financial valuation summary using Rupiah (Rp). Format numbers correctly (e.g., Rp 1.000.000).
        
        Format the output as clean Markdown in Indonesian.
      `,
    });
    return response.text || "No insights generated.";
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return "Gagal menghasilkan insight. Cek API Key di Admin Panel.";
  }
};

export const chatWithInventoryBot = async (
  query: string, 
  items: InventoryItem[], 
  apiKey?: string
): Promise<string> => {
  try {
    const ai = getClient(apiKey);
    if (!ai) return "Sistem AI tidak dapat membalas karena API Key belum dikonfigurasi.";
    const inventoryData = formatInventoryContext(items);
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `
          Anda adalah "SmartStock Agent", asisten AI cerdas untuk manajer gudang di Indonesia.

          **KEMAMPUAN ANDA:**
          1. **Kecerdasan Umum:** Jawab pertanyaan, selesaikan masalah, tulis email, atau ngobrol santai.
          2. **Ahli Inventaris:** Gunakan data inventaris gudang real-time yang disediakan.

          **KONTEKS INVENTARIS SAAT INI (JSON):**
          ${inventoryData}
          
          **PANDUAN:**
          - Jika user bertanya tentang stok atau nilai, gunakan data JSON tersebut.
          - SELALU gunakan format mata uang Rupiah (Rp) dan gunakan pemisah ribuan (contoh: Rp 10.000).
          - Bersikap profesional, ringkas, dan membantu.
          - Gunakan bahasa Indonesia secara utama kecuali user bertanya dalam bahasa lain.
        `,
      },
    });
    const response = await chat.sendMessage({ message: query });
    return response.text || "Maaf, saya tidak mengerti.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Maaf, ada gangguan koneksi ke AI. Mohon verifikasi API Key Anda.";
  }
};