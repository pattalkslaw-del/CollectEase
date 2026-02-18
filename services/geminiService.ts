
import { GoogleGenAI } from "@google/genai";
import { LetterData, IntensityLevel } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateCollectionsLetter = async (data: LetterData): Promise<string> => {
  const { business, customer, invoice, intensity } = data;
  
  const totalAmount = invoice.items.reduce((sum, item) => sum + item.amount, 0) + (invoice.lateFees || 0);
  
  const prompt = `
    Generate a professional business collections letter based on the following details.
    
    INTENSITY LEVEL: ${intensity}
    JURISDICTION: ${business.state} (Ensure any relevant state-specific professional tone is applied).
    
    BUSINESS INFO:
    - Name: ${business.name}
    - Address: ${business.address}
    - State: ${business.state}
    - Phone: ${business.phone}
    - Email: ${business.email}
    
    CUSTOMER INFO:
    - Name: ${customer.name}
    - Contact Person: ${customer.contactPerson}
    - Address: ${customer.address}
    
    INVOICE DETAILS:
    - Invoice #: ${invoice.invoiceNumber}
    - Invoice Date: ${invoice.invoiceDate}
    - Original Due Date: ${invoice.originalDueDate}
    - New Payment Deadline: ${invoice.newDeadline}
    - Itemized Charges: ${invoice.items.map(i => `${i.description} ($${i.amount})`).join(', ')}
    - Late Fees: $${invoice.lateFees}
    - Total Amount Due: $${totalAmount.toFixed(2)}
    
    CALL TO ACTION / PAYMENT:
    - Instructions: ${invoice.paymentInstructions}
    - Direct Payment Link: ${invoice.paymentLink || 'Not provided'}
    - Payment Support Phone: ${invoice.paymentPhone || business.phone}
    
    TONE GUIDELINES:
    - Friendly Reminder: Polite, assumes a simple oversight, focuses on maintaining the relationship. Explicitly offer a flexible payment plan.
    - Firm Demand: Serious, professional, mentions consequences like late fees or service interruption if not paid by the new deadline. State that documentation is available upon request.
    - Final Notice: Urgent, strict, mentions that failure to resolve by ${invoice.newDeadline} will result in the matter being turned over to an attorney or collections agency for further action in the state of ${business.state}.
    
    REQUIRED STRUCTURE:
    1. Header with both Business and Customer details.
    2. Date of letter.
    3. Clear Subject Line (e.g., ACTION REQUIRED: Overdue Invoice #${invoice.invoiceNumber}).
    4. Personalize the salutation.
    5. Clear debt details (including itemized list) and CTA.
    6. Specific payment instructions (include link if provided).
    7. Professional closing.
    
    The output should be a single well-formatted professional letter. Use Markdown headers for the subject line only. Do not use blockquotes. Use clear line breaks between paragraphs.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Failed to generate letter.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error: Unable to connect to the AI service. Please check your API key.";
  }
};
