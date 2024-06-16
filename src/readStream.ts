import { InvocationContext } from "@azure/functions";

/**
 * Creates a readable stream from a stream to return as response body
 * 
 * @param reader The stream reader.
 * @param context The context object.
 * @returns A readable stream.
 */
export async function createStreamBody(reader, context): Promise<ReadableStream> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      await readStream(reader, context, (chunk) => {
        const encodedChunk = encoder.encode(chunk);
        controller.enqueue(encodedChunk);
      });
      controller.close();
    }
  });
}

/**
 * Reads a stream of data from a ReadableStreamDefaultReader and processes it.
 * 
 * @param reader - The ReadableStreamDefaultReader to read data from.
 * @param context - The InvocationContext object.
 * @param onChunk - A callback function to handle each chunk of data read from the stream.
 */
async function readStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  context: InvocationContext,
  onChunk: (chunk: string) => void) {
    
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });

      try {
        const json = JSON.parse(text);
        const delta = json.choices[0]?.delta?.content;

        if (delta) {
          onChunk(delta);
        }
      } catch (e) {
        context.log(`Failed to parse JSON: ${e.message}`);
      }
    }
  } catch (error) {
    context.log('Error reading the stream:', error);
  } finally {
    reader.releaseLock();
  }
}