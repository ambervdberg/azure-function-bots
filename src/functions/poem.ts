import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import OpenAI from "openai";
import { createStreamBody } from "../readStream";


/**
 * Handles the poem function.
 * 
 * This function generates a poem about information technology.
 * Streams the result back to the client.
 * 
 * @param request - The HTTP request object.
 * @param context - The invocation context object.
 * @returns A promise that resolves to an HTTP response object.
 */
export async function poem(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  const openAI = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const message = request.query.get('message') || await request.text() || 'A competent female software developer';

  const completion = await openAI.chat.completions.create({
    messages: [{
      role: 'system',
      content: process.env.POEM_SYSTEM_MESSAGE
    }, {
      role: 'user',
      content: message
    }],
    model: 'gpt-4o',
    stream: true
  });

  const reader = completion.toReadableStream().getReader();

  const body = await createStreamBody(reader, context) as any;

  return { body };
};

app.setup({ enableHttpStream: true });

app.http('poem', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: poem
});
