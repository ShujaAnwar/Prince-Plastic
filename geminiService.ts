
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function analyzeProductionWastage(productionData: any) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        Analyze the following production data for Prince Plastic. 
        Focus on wastage percentages at roll manufacturing and shopper conversion stages.
        Provide actionable insights to reduce wastage and optimize costs.
        
        Data: ${JSON.stringify(productionData)}
        
        Return the analysis in professional manufacturing terms. Include a summary and 3 bullet points of suggestions.
      `,
    });
    return response.text;
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return "Unable to generate AI analysis at this time. Please check production parameters manually.";
  }
}

export async function getProductionForecast(inventoryData: any, salesData: any) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        Based on current raw material stock and recent sales trends, suggest a production plan for next week.
        Identify which shopper sizes are running low and should be prioritized.
        
        Inventory: ${JSON.stringify(inventoryData)}
        Sales: ${JSON.stringify(salesData)}
        
        Keep it concise and practical.
      `,
    });
    return response.text;
  } catch (error) {
    return "Forecasting currently unavailable.";
  }
}
