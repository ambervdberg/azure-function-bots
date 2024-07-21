import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import OpenAI from 'openai';

// Validate environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUBJECT_SYSTEM_MESSAGE = process.env.SUBJECT_SYSTEM_MESSAGE;
const SUBJECT_USER_MESSAGE = process.env.SUBJECT_USER_MESSAGE;
const GPT_MODEL = process.env.GPT_MODEL;

if (!OPENAI_API_KEY || !SUBJECT_SYSTEM_MESSAGE || !GPT_MODEL || !SUBJECT_USER_MESSAGE) {
  throw new Error('Missing required environment variables');
}

/**
 * Handles the subject function.
 *
 * This function generates a prompt for a short poem about software engineering.
 *
 * @param request - The HTTP request object.
 * @param context - The invocation context object.
 * @returns A promise that resolves to an HttpResponseInit object.
 */
export async function subject(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  const openAI = new OpenAI({
    apiKey: OPENAI_API_KEY
  });

  const completion = await openAI.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: SUBJECT_SYSTEM_MESSAGE
      },
      {
        role: 'user',
        content: SUBJECT_USER_MESSAGE
      }
    ],
    model: GPT_MODEL,
    stream: false
  });

  return { status: 200, body: completion.choices[0].message.content };
}

app.http('subject', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: subject
});
