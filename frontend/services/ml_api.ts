import { ML_API_BASE_URL } from '../config/api';

// Function to analyze all unanalyzed thoughts
export const analyzeAllUnanalyzedThoughts = async (userId: number): Promise<{ status: string; count: number }> => {
  try {
    const response = await fetch(`${ML_API_BASE_URL}/api/analyze-all-unanalyzed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    
    if (!response.ok) {
      throw new Error('Failed to trigger analysis');
    }
    
    const data = await response.json();
    console.log(`[analyzeAllUnanalyzedThoughts] Analysis triggered for ${data.count} thoughts`);
    return data;
  } catch (error) {
    console.error("API Error analyzeAllUnanalyzedThoughts:", error);
    throw error;
  }
};

