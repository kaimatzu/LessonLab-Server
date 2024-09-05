import OpenAI from 'openai';

import { encoding_for_model } from "tiktoken";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { ParsedChatCompletionMessage } from 'openai/resources/beta/chat/completions';
import { uuid } from "uuidv4";

//////////////////////////////////////
/// AI Response format definitions ///
//////////////////////////////////////

export const IntentTypeEnum = z.enum([
  "query",
  "command",
  "informative",
  "conversational",
  "miscellaneous",
]);

export const IntentProcessingSchema = z.object({
  subject: z
    .string()
    .describe("The core subject matter, the focus, or main semantic idea of the prompt. This is the area of interest that the user has provided.")
    .optional(),
  intent_type: IntentTypeEnum
    .describe("The intent type of the prompt as a whole. This is a single word output that describes the prompt concisely."),
  context_instructions: z
    .string()
    .describe("The context in which the subject matter is encapsulated in. This includes what the user has instructed to you, the system. This must be as elaborate but concise as possible so that the most important parts of the prompt is captured within the least amount of words as possible."),
}).strict();

export const commandTypeEnum = z.enum([
  "create_module",
  "create_assessment",
  "reorganize_module",
  "reorganize_assessment",
  "rewrite_module_page",
  "rewrite_module_page_section",
  "miscellaneous"
]);


export const CommandProcessingSchema = z.object({
  command_type: z.string().describe("The command type of the prompt as a whole. This is a single word output that describes the prompt concisely."),

}).strict();

// Modules

export interface ModuleOutline {
  id?: string;
  name: string;
  description: string;
  moduleNodes: ModuleNodeOutline[];
}

export interface ModuleNodeOutline {
  id?: string;
  title: string;
  description: string;
  children?: ModuleNodeOutline[];
}

export const ModuleNodeOutlineSchema: z.ZodSchema<ModuleNodeOutline> = z.lazy(() =>
  z.object({
    title: z
      .string()
      .describe("The title of the node, representing a section, sub-section, or sub-subsection within the module."),
    description: z
      .string()
      .describe("A brief description of the node's content, explaining the focus of the section or sub-section."),
    children: z
      .array(z.lazy(() => ModuleNodeOutlineSchema))
      .describe("An optional array of child nodes, representing sub-sections or further subdivisions of the content.")
      .optional(),
  })
).describe("A structure representing a node within a module outline, which can be a section, sub-section, or sub-subsection.");

export const ModuleOutlineSchema: z.ZodSchema<ModuleOutline> = z.object({
  name: z
    .string()
    .describe("The name of the module, encapsulating the entire tree structure. This name differentiates it from other modules."),
  description: z
    .string()
    .describe("A detailed description of the module as a whole, providing an overview of the content covered by the module."),
  moduleNodes: z
    .array(ModuleNodeOutlineSchema)
    .describe("An array of top-level nodes, each representing a major section of the module. These nodes can have their own sub-sections, sub-subsections, and so on."),
}).describe("The overall structure of a module, encapsulating multiple sections. Each section is represented by a top-level node that may contain nested sub-sections.");


//////////////////////////////////////
/////// Token Usage calculators //////
//////////////////////////////////////

export const encoding4o_mini = encoding_for_model("gpt-4o-mini");
export const encoding4o = encoding_for_model("gpt-4o");

export async function calculateTokens4o_mini(message: string | undefined | null): Promise<number> {
  if (!message) return 0;
  return encoding4o_mini.encode(message).length;
}

export async function calculateTokens4o(message: string | undefined | null): Promise<number> {
  if (!message) return 0;
  return encoding4o.encode(message).length;
}

//////////////////////////////////////
/// User Input Processing Pipeline ///
//////////////////////////////////////

export async function intentDecomposition(openai: OpenAI, message: string): 
  Promise<ParsedChatCompletionMessage<{[x: string]: any;}>> 
{
  try {
    const intentDecompositionSystemPrompt = 
`You are an AI agent that's part of a user input processing pipeline who's main task is to decompose the intent of the user. Given the prompt of the user, decompose the user's input into it's subject matter, and the intent type of the prompt in the required format, and the context instructions if applicable.

Information on the intent types are below.

Context instructions are required:
- query: The user's intent is a query type. The user is asking a question or wishes to acquire information.
- command: The user's intent is a command. The user is asking you, the system to perform a task.
- informative: The user's intent is informational. This means that the user is trying to inform you, the system, a piece of context or information.

No context instructions (output as "none"):
- conversational: The user is greeting the system, or there is no intrinsic subject or topic within the user's prompt.
- miscellaneous: If the user is prompting nonsensical inputs, just output the subject matter as "none" and the intent type as "miscellaneous".`;
      
    const intentDecompositionCompletion = await openai.beta.chat.completions.parse({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: intentDecompositionSystemPrompt },
        { role: "user", content: message },
      ],
      response_format: zodResponseFormat(IntentProcessingSchema, "intent-processing"),
    });
    
    const parsedIntentValues = intentDecompositionCompletion.choices[0].message;

    if (!parsedIntentValues) throw new Error("No intent decomposition completion generated.");

    return parsedIntentValues;
  } catch (error) {
    throw new Error(`Intent decomposition error: ${error}`);
  }
}

export async function commandDecomposition(openai: OpenAI, message: string): 
  Promise<ParsedChatCompletionMessage<{[x: string]: any;}>> 
{
  try {
    const commandDecompositionSystemPrompt = 
`You are an AI agent that's part of a user input processing pipeline who's main task is to decompose the command of the user. Decompose the user's input into it's subject matter, and the intent type of the prompt in the required format. 

Information on command types:

- create_module: If the command is to create educational reading materials, lessons, modules, etc.
- create_assessment: If the command is to create quizzes, assessments, examinations, etc.
- reorganize_module: If the command is to reorganize or rearrange the user's module, reading materials, lessons, etc. 
- reorganize_assessment: If the command is to reorganize or rearrange the user's quizzes, assessments, - examinations, etc.
- rewrite_module: If the command is to rewrite the user's entire module.
- rewrite_module_page: If the command is to rewrite the user's module page.
- rewrite_module_page_section:  If the command is to rewrite a section of the user's module page.
- miscellaneous: If the command does not fall into any of the aforementioned categories.`;
      
    const commandDecompositionCompletion = await openai.beta.chat.completions.parse({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: commandDecompositionSystemPrompt },
        { role: "user", content: message },
      ],
      response_format: zodResponseFormat(CommandProcessingSchema, "command-processing"),
    });
    
    const parsedCommandValues = commandDecompositionCompletion.choices[0].message;

    if (!parsedCommandValues) throw new Error("No command decomposition completion generated.");

    return parsedCommandValues;
  } catch (error) {
    throw new Error(`Command decomposition error: ${error}`);
  }
}

//////////////////////////////////////
///// Command Processing Pipeline ////
//////////////////////////////////////

// Modules
export async function createModuleOutline(openai: OpenAI, subject: string, context_instructions: string): 
  Promise<ParsedChatCompletionMessage<{[x: string]: any;}>> {
    try {
      const createModuleOutlinePrompt = 
`You are an AI agent that's part of a command input processing pipeline who's main task is to create an outline for a module. Modules are learning material that have a recursive structure (like sections, sub-sections, etc.)

Make the module outline as detailed as possible to your available knowledge. Ensure the outline is comprehensive and semantically concrete. 

This is the subject for the module: ${subject}`;
        
      const createModuleOutlineCompletion = await openai.beta.chat.completions.parse({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: createModuleOutlinePrompt },
          { role: "assistant", content: context_instructions },
        ],
        response_format: zodResponseFormat(ModuleOutlineSchema, "module-outline"),
      });
      
      const parsedModuleOutlineValues = createModuleOutlineCompletion.choices[0].message;
  
      if (!parsedModuleOutlineValues) throw new Error("No module outline completion generated.");
  
      return parsedModuleOutlineValues;
    } catch (error) {
      throw new Error(`Module outline creation error: ${error}`);
    }
}

// Function to generate a module outline
export async function generateModuleOutlineResponse(openai: any,
  subject: string,
  context_instructions: string): Promise<ModuleOutline> {

  const createModuleCompletion = await createModuleOutline(openai, subject, context_instructions);

  // Function to add unique IDs to the module and each node
  const attachIds = (module: ModuleOutline) => {
    // Assign IDs to each moduleNode and their children
    const assignNodeIds = (nodes: ModuleNodeOutline[]) => {
      nodes.forEach(node => {
        node.id = uuid();
        if (node.children) {
          assignNodeIds(node.children);
        }
      });
    };

    assignNodeIds(module.moduleNodes);
  };

  // Attach IDs to the module and its nodes
  attachIds(createModuleCompletion.parsed as ModuleOutline);

  console.log("Module outline:", createModuleCompletion.parsed);

  return createModuleCompletion.parsed as ModuleOutline;
}