import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  try {
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
