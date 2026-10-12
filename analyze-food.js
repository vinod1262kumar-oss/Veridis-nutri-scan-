import { GoogleGenAI } from "@google/genai";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
];

export default async function handler(req, res) {
  // This endpoint accepts POST requests only.
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      success: false,
      error: "Method not allowed. Use POST."
    });
  }

  try {
    const {
      GEMINI_API_KEY,
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    } = process.env;

    if (
      !GEMINI_API_KEY ||
      !SUPABASE_URL ||
      !SUPABASE_PUBLISHABLE_KEY
    ) {
      console.error("Required server environment variables are missing.");

      return res.status(500).json({
        success: false,
        error: "Server configuration is incomplete."
      });
    }

    // Require a signed-in Supabase user.
    const authorization = req.headers.authorization || "";
    const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);

    if (!tokenMatch) {
      return res.status(401).json({
        success: false,
        error: "Please sign in before scanning food."
      });
    }

    const accessToken = tokenMatch[1];

    // Verify the access token with Supabase.
    const authResponse = await fetch(
      `${SUPABASE_URL.replace(/\/+$/, "")}/auth/v1/user`,
      {
        method: "GET",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (!authResponse.ok) {
      return res.status(401).json({
        success: false,
        error: "Your session is invalid or expired. Please sign in again."
      });
    }

    // Validate the submitted image.
    const { image } = req.body || {};

    if (typeof image !== "string") {
      return res.status(400).json({
        success: false,
        error: "Please upload a food-label image."
      });
    }

    const imageMatch = image.match(
      /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/
    );

    if (!imageMatch) {
      return res.status(400).json({
        success: false,
        error: "Use a valid JPEG, PNG, or WebP image."
      });
    }

    const mimeType = imageMatch[1];
    const base64Data = imageMatch[2];

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return res.status(400).json({
        success: false,
        error: "Unsupported image format."
      });
    }

    const estimatedBytes = Math.floor(
      (base64Data.length * 3) / 4
    );

    if (estimatedBytes > MAX_IMAGE_BYTES) {
      return res.status(413).json({
        success: false,
        error: "Image is too large. Please use an image under 3 MB."
      });
    }

    // Send the image to Gemini for food-label analysis.
    const ai = new GoogleGenAI({
      apiKey: GEMINI_API_KEY
    });

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const prompt = `
You are VERIDIS NutriScan, an assistant that analyzes packaged-food labels.

Examine the provided image carefully. Read only information that is visible.
Never invent nutrition values, ingredients, certifications, or package claims.

Return a JSON object with these fields:
{
  "productName": "product name or Unknown",
  "summary": "brief evidence-based summary",
  "overallScore": 0,
  "scoreExplanation": "explain the score and uncertainty",
  "nutrition": {
    "servingSize": "visible serving size or Not visible",
    "calories": "visible value or Not visible",
    "protein": "visible value or Not visible",
    "carbohydrates": "visible value or Not visible",
    "sugar": "visible value or Not visible",
    "fat": "visible value or Not visible",
    "saturatedFat": "visible value or Not visible",
    "fiber": "visible value or Not visible",
    "sodium": "visible value or Not visible"
  },
  "ingredients": [],
  "positivePoints": [],
  "concerns": [],
  "claimChecks": [
    {
      "claim": "package claim, if visible",
      "assessment": "Supported, Unclear, or Not verifiable",
      "reason": "evidence-based explanation"
    }
  ],
  "allergens": [],
  "recommendations": [],
  "limitations": []
}

Rules:
- overallScore must be an integer from 0 to 100, representing a cautious general nutrition assessment, not a medical diagnosis.
- Use only visible evidence for label facts.
- If the label is blurry, incomplete, or unreadable, say so.
- Do not assume a product is healthy merely because its packaging says so.
- Distinguish verified label information from estimates or interpretations.
- Do not claim to verify laboratory testing, authenticity, or hidden ingredients from an image.
- Treat missing information as "Not visible" or an empty array.
- Keep the response informative and concise.
`;

    const result = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const responseText = result.text;

    if (!responseText) {
      throw new Error("Gemini returned an empty response.");
    }

    let analysis;

    try {
      analysis = JSON.parse(responseText);
    } catch {
      console.error("Gemini returned invalid JSON.");
      return res.status(502).json({
        success: false,
        error: "The food analysis response could not be processed. Please try again."
      });
    }

    return res.status(200).json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error("Food analysis failed:", error.message);

    return res.status(500).json({
      success: false,
      error: "Food analysis failed. Please try again."
    });
  }
      }
