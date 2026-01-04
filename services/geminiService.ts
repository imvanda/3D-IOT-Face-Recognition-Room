import { GoogleGenAI, Type } from "@google/genai";
import { IotDevice } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseSmartHomeCommand = async (command: string, currentDevices: IotDevice[]) => {
  try {
    const deviceListString = currentDevices.map(d => `${d.name} (ID: ${d.id}, State: ${d.status ? 'ON' : 'OFF'}, Value: ${d.value})`).join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a smart home assistant. The user will give a command in Chinese.
      Current Device States:
      ${deviceListString}

      User Command: "${command}"

      Instructions:
      1. Analyze the command.
      2. Return a JSON array of objects representing the NEW state for affected devices.
      3. Only include devices that need to change.
      4. If "turn on AC" is said, set status to true.
      5. Do not include explanation, just the JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "The exact ID of the device" },
              status: { type: Type.BOOLEAN, description: "Whether the device should be on or off" },
              value: { type: Type.STRING, description: "Optional new value (e.g. temperature, height)" }
            },
            required: ["id"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return [];
  }
};