import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import OpenAI from 'openai';
import { createStreamBody } from '../../readStream';

// Validate environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const NOTION_SYSTEM_MESSAGE = process.env.NOTION_SYSTEM_MESSAGE;
const GPT_MODEL = process.env.GPT_MODEL;
const API_BASE_URL = process.env.BASE_URL;
const NOTION_SYSTEM_MESSAGE_EXTRACT_SEARCH_QUERY =
  process.env.NOTION_SYSTEM_MESSAGE_EXTRACT_SEARCH_QUERY;
const NOTION_WORKSPACES = process.env.NOTION_WORKSPACES;

if (
  !OPENAI_API_KEY ||
  !NOTION_SYSTEM_MESSAGE ||
  !GPT_MODEL ||
  !API_BASE_URL ||
  !NOTION_SYSTEM_MESSAGE_EXTRACT_SEARCH_QUERY ||
  !NOTION_WORKSPACES
) {
  throw new Error('Missing required environment variables');
}

/**
 * The notion function processes the HTTP request and returns a response.
 *
 * It uses the OpenAI API to extract a search query from the question
 * and then searches for relevant information in Notion through the Notion API.
 * The function then uses the OpenAI API to generate a response based on the search results and the question.
 *
 * @param request - The HTTP request object.
 * @param context - The invocation context object.
 * @returns A promise that resolves to an HttpResponseInit object.
 */
export async function notion(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Http notion processed request for url "${request.url}"`);

  const openAI = new OpenAI({
    apiKey: OPENAI_API_KEY
  });

  const question: string = request.query.get('question') || (await request.text());
  const workspace: string | null = request.query.get('workspace');

  if (!question) {
    return { status: 400, body: 'Bad Request: question parameter is required' };
  }

  try {
    const query: string = await extractSearchQuery(openAI, question);
    context.log('search query', query);

    let notionSearchResponse = await searchNotion(query, workspace);

    // Return an error response if the search query does not return any information.
    if (!notionSearchResponse.ok) {
      context.log(`Error: ${notionSearchResponse.status} - ${notionSearchResponse.statusText}`);
      return {
        status: notionSearchResponse.status,
        body: `Error: ${notionSearchResponse.statusText}`
      };
    }

    const responseBody: string = await notionSearchResponse.text();
    let notionContext: string;

    // Parse the text content if it's in JSON format
    try {
      notionContext = JSON.parse(responseBody);
    } catch {
      notionContext = responseBody;
    }

    const completion = await openAI.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: NOTION_SYSTEM_MESSAGE
        },
        {
          role: 'system',
          content: `Notion context:\n${notionContext}`
        },
        {
          role: 'user',
          content: question
        }
      ],
      model: GPT_MODEL,
      stream: true
    });

    const reader = completion.toReadableStream().getReader();

    const body = (await createStreamBody(reader, context)) as any;

    return { body };
  } catch (error) {
    context.log('An error occurred', error);
    return { status: 500, body: 'Internal Server Error' };
  }
}

/**
 * Search for relevant information in Notion using the search query.
 * The function searches in the given workspace if provided.
 * If no relevant information is found and no specific workspace is given,
 * it tries all workspaces one by one until it finds relevant information.
 *
 * @param query The search query extracted from the question.
 * @param givenWorkspace The workspace to search in. If not provided, the function will try all workspaces one by one until it finds relevant information.
 * @returns The response from the Notion API.
 */
async function searchNotion(query: string, givenWorkspace?: string): Promise<Response> {
  const workspaces = getWorkspaces();

  let workspaceIndex = 0;

  let workspace = givenWorkspace ?? workspaces[workspaceIndex];

  let notionSearchResponse = await getNotionContext(query, workspace);

  // Return the response directly if a specific workspace to search in is given.
  if (givenWorkspace) {
    return notionSearchResponse;
  }

  // Keep trying with other available workspaces if no relevant content is found and no specific workspace is given.
  while (notionSearchResponse.status === 404 && workspaceIndex < workspaces.length - 1) {
    workspaceIndex++;
    workspace = workspaces[workspaceIndex];
    notionSearchResponse = await getNotionContext(query, workspace);
  }

  return notionSearchResponse;
}

/**
 * Search for relevant information in Notion using the search query.
 * The function searches in the given workspace if provided.
 * If no relevant information is found and no specific workspace is given,
 * it tries all workspaces one by one until it finds relevant information.
 *
 * @param query - The search query extracted from the question.
 * @param givenWorkspace - The workspace to search in. If not provided, the function will try all workspaces one by one until it finds relevant information.
 * @returns The response from the Notion API.
 */
async function extractSearchQuery(openAI: OpenAI, question: string): Promise<string> {
  const completion = await openAI.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: NOTION_SYSTEM_MESSAGE_EXTRACT_SEARCH_QUERY
      },
      {
        role: 'user',
        content: question
      }
    ],
    model: GPT_MODEL,
    stream: false
  });

  return completion.choices[0].message.content;
}

/**
 * Get the Notion context for the search query.
 *
 * @param query - The search query.
 * @param workspace - The workspace to search in.
 * @returns The Notion context for the search query.
 */
async function getNotionContext(query: string, workspace: string): Promise<Response> {
  return await fetch(`${API_BASE_URL}/api/notion/search?workspace=${workspace}&query=${query}`);
}

/**
 * Get the workspaces which are available for searching.
 * @returns The workspaces to search in.
 */
function getWorkspaces(): string[] {
  return NOTION_WORKSPACES.split(',');
}

app.setup({ enableHttpStream: true });

app.http('notion', {
  methods: ['GET', 'POST'],
  authLevel: 'function',
  handler: notion
});
