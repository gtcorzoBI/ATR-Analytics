import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY || "dummy_key");

async function run() {
  try {
    // The google-generative-ai SDK does not have a direct listModels method exposed in the main class easily in all versions.
    // Instead, I'll fetch it directly using fetch.
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.VITE_GEMINI_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    console.log("AVAILABLE MODELS:");
    if (data.models) {
      data.models.forEach(m => console.log(m.name, m.supportedGenerationMethods));
    } else {
      console.log(data);
    }
  } catch (err) {
    console.error("Error listing models:", err);
  }
}

run();
