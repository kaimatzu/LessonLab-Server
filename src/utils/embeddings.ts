//embeddings.ts

import OpenAI from "openai";
import config from "../config";

/**
 * Embed a piece of text using an embedding model or service.
 * This is a placeholder and needs to be implemented based on your embedding solution.
 *
 * @param text The text to embed.
 * @returns The embedded representation of the text.
 */
export async function embedChunks(chunks: string[]): Promise<any> {
  // You can use any embedding model or service here.
  // In this example, we use OpenAI's text-embedding-3-small model.
  const openai = new OpenAI({
    apiKey: config.openAiApiKey,
    organization: config.openAiOrganizationId,
  });
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunks,
      encoding_format: "float",
      dimensions: 1536,
    });
    return response.data;
  } catch (error) {
    console.error("Error embedding text with OpenAI:", error);
    throw error;
  }
}

/**
 * Embed a piece of text using an embedding model or service.
 * This is a placeholder and needs to be implemented based on your embedding solution.
 *
 * @param text The text to embed.
 * @returns The embedded representation of the text.
 */
export async function embedQuizChunks(chunks: string[]): Promise<any> {
  // You can use any embedding model or service here.
  // In this example, we use OpenAI's text-embedding-3-small model.

  // TODO: Find the AI generation and add this for function calling
  // Links:
  // https://www.youtube.com/watch?v=lJJkBaO15Po
  // https://www.youtube.com/watch?v=UtwDAge75Ag
  // https://www.youtube.com/watch?v=4vjYkKnGmFs
  // https://www.youtube.com/watch?v=JaLP0Xi-rEk
  const functions = [{
    'name': 'generate_multiple_choice_quiz',
    'description': 'Generates a multiple choice quiz',
    'parameters': {
      'type': 'object',
      'description': 'A multiple choice quiz',
      'number': {
        'type': 'array',
        'description': 'A multiple choice quiz with questions and answers',
        'items': {
          'type': 'object',
          'description': 'An item in the quiz',
          'question': {
            'type': 'string',
            'description': 'The question of the item'
          },
          'choices': {
            'type': 'array',
            'description': 'List of choices one of which is the correct answer',
            'items': {
              'type': 'string',
              'description': 'A choice in a multiple choice type question'
            }
          }
        }
      },
    },
  },
  {
    'name': 'generate_identification_quiz',
    'description': 'Generates an identificaiton quiz',
    'parameters': {
      'type': 'object',
      'description': 'An identification quiz',
      'number': {
        'type': 'array',
        'description': 'List of items in the quiz',
        'items': {
          'type': 'object',
          'description': 'An item in the quiz',
          'question': {
            'type': 'string',
            'description': 'The question of the item'
          },
          'answer': {
            'type': 'string',
            'description': 'The correct answer of the item'
          }
        },
      },
    }
  }]

  const openai = new OpenAI({
    apiKey: config.openAiApiKey,
    organization: config.openAiOrganizationId,
  });
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunks,
      encoding_format: "float",
      dimensions: 1536,
    });
    return response.data;
  } catch (error) {
    console.error("Error embedding text with OpenAI:", error);
    throw error;
  }
}
