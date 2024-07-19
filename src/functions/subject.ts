import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import OpenAI from "openai";

/**
 * Handles the subject function.
 * 
 * This function generates a prompt for a short poem about software engineering.
 * 
 * @param request - The HTTP request object.
 * @param context - The invocation context object.
 * @returns A promise that resolves to an HttpResponseInit object.
 */
export async function subject(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);
        
    const openAI = new OpenAI({
        apiKey:  process.env.OPENAI_API_KEY
    });

    const completion = await openAI.chat.completions.create({
      messages: [{
        role: 'system',
        content: process.env.SUBJECT_SYSTEM_MESSAGE
      }, {
        role: 'user',
        content: process.env.SUBJECT_USER_MESSAGE
      }],
      model: process.env.GPT_MODEL,
      stream: false
    });

    return { status: 200, body: completion.choices[0].message.content };
};

app.http('subject', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: subject 
});
