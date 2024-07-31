import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ConfigurationError } from './configuration-error';

const ALLOWED_EMAIL = process.env.ALLOWED_EMAIL;
const AZURE_FUNCTION_CODE = process.env.AZURE_FUNCTION_CODE;

if (!ALLOWED_EMAIL || !AZURE_FUNCTION_CODE) {
  throw new ConfigurationError();
}

/**
 * Handles the authentication function.
 *
 * This function checks if the given email is authorized.
 *
 * @param request - The HTTP request object.
 * @param context - The invocation context object.
 * @returns A promise that resolves to an HttpResponseInit object.
 */
export async function authGoogle(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  // Get the access token from the query or the request body
  const accessToken = request.query.get('access_token') || (await request.text());

  try {
    // Fetch the user profile using the access token
    const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    // Handle unsuccessful response from the fetch call
    if (!response.ok) {
      const errorText = await response.text();
      context.error(errorText);
      return { status: response.status, body: errorText };
    }

    const profile = await response.json();

    // Check if the email is authorized
    if (profile.email !== ALLOWED_EMAIL) {
      return { status: 403, body: 'Forbidden' };
    }

    // Return the Azure function code if authorized
    return { status: 200, body: AZURE_FUNCTION_CODE };
  } catch (error) {
    // Handle any unexpected errors
    context.error(error.message);
    return { status: 500, body: 'Internal Server Error' };
  }
}

app.http('auth-google', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: authGoogle
});
