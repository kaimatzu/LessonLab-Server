import OpenAI from 'openai';
import { Server as SocketIO } from 'socket.io';

import {encoding_for_model} from "tiktoken";
import {z} from "zod";
import {zodResponseFormat} from "openai/helpers/zod";
import {ParsedChatCompletionMessage} from 'openai/resources/beta/chat/completions';
import {uuid} from "uuidv4";
import moduleController from '../../controllers/moduleController';

import {serializeTuple} from '../../socketServer';

import {ChatCompletionMessageParam} from 'openai/resources';
import documentController from '../../controllers/documentController';
import {chunkAndEmbedFile} from '../documentProcessor';

import {Result} from '../../types/result';

import {
  ChatCompletionEvents,
  Client, ClientOptions, EmitEvents, EventsMap, ListenEvents, MessageType,
  Module,
  ModuleNode,
  WorkspaceModuleKey,
  WorkspaceModulesProxy,
} from '../../types/globals';
import assistantController from "../../controllers/assistantController";
import {ChatCompletionSnapshot} from "openai/lib/ChatCompletionStream";
import {DefaultEventsMap} from "socket.io/dist/typed-events";

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
  name: string;
  description: string;
  children?: ModuleNodeOutline[];
}

export const ModuleNodeOutlineSchema: z.ZodSchema<ModuleNodeOutline> = z.lazy(() =>
  z.object({
    name: z
      .string()
      .describe("The name of the node, representing a section, sub-section, or sub-subsection within the module."),
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
    Promise<Result<ParsedChatCompletionMessage<{[x: string]: any;}>>> {

  try {
    const intentDecompositionSystemPrompt =
        `You are an AI agent that's part of a user input processing pipeline whose main task is to decompose the intent of the user. Given the prompt of the user, decompose the user's input into its subject matter, the intent type of the prompt in the required format, and the context instructions if applicable.

Information on the intent types are below.

Context instructions are required:
- query: The user's intent is a query type. The user is asking a question or wishes to acquire information.
- command: The user's intent is a command. The user is asking you, the system, to perform a task.
- informative: The user's intent is informational. This means that the user is trying to inform you, the system, of a piece of context or information.

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

    if (!parsedIntentValues) {
      return Result.err(new Error("No intent decomposition completion generated.")); // Return Result with error
    }

    return Result.ok(parsedIntentValues); // Return Result with the parsed values
  } catch (error) {
    return Result.err(new Error(`Intent decomposition error: ${error}`)); // Return Result with the caught error
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

export async function insertModuleNode(moduleId: string, nodes: ModuleNodeOutline, ancestor: string, position: number = 0, depth: number = 1) {
  try {
    // Insert the current node with its depth and position
    await moduleController.insertChildToModuleNodeCallback(ancestor, moduleId, nodes.id!, '', nodes.name, position, depth);

    // If there are no children, return
    if (!nodes.children || nodes.children.length === 0) return;

    // Use Promise.all to insert all child nodes in parallel
    await Promise.all(
      nodes.children.map(async (childNode: ModuleNodeOutline, index: number) => {

        // Recursively insert the child node, increasing depth by 1
        await insertModuleNode(moduleId, childNode, nodes.id!, index, depth + 1); // Await the recursive call
      })
    );
  } catch (error) {
    console.error("Error inserting module node: ", error);
  }
}

//////////////////////////////////////
//////      Module Creation     //////
//////////////////////////////////////

export async function createModule(client: Client, moduleId: string, workspaceId: string, module: Module, subject: string, context_instructions: string, workspaceModulesBufferProxy: WorkspaceModulesProxy, openai: OpenAI) {
  client.emit('create-module', moduleId!, workspaceId, module.name, module.description, async (ack: string) => {
    if (ack === 'module-created') {
      // Proceed with the accepted module outline 
      console.log("Module outline data", module);

      const serializedKey = serializeTuple([moduleId, workspaceId]);
      
      const moduleBuffer: Module = {
        id: moduleId,
        name: module.name,
        description: module.description,
        nodes: module.nodes
      }

      workspaceModulesBufferProxy.set(serializedKey, moduleBuffer);

      let i = 0;
      for (const node of module.nodes) {
        const traverseModuleNodes = async (
          moduleId: string,
          workspaceId: string,
          node: ModuleNodeOutline
        ) => {
          // Call generateModuleNodeContent for the current node sequentially
          if (node.id) {
            await generateModuleNodeContent(
              moduleId,
              node.id,
              workspaceId,
              node.name,
              node.description,
              subject,
              context_instructions,
              workspaceModulesBufferProxy,
              openai,
            );
          }
          
          console.log("Iteration", i++);

          // If this node has children, recursively call traverseModuleNodes for each child
          if (node.children && node.children.length > 0) {
            for (const childNode of node.children) {
              await traverseModuleNodes(moduleId, workspaceId, childNode);
            }
          }
        };
      
        // Traverse each module node sequentially
        await traverseModuleNodes(moduleId, workspaceId, node);
      }
      
      workspaceModulesBufferProxy.emit(serializedKey, 'end');
    }
  })
}

export async function createModuleFromOutline(client: Client, moduleOutlineData: ModuleOutline, result: any, workspaceId: string, rootNode: string, subject: string, context_instructions: string, workspaceModulesBufferProxy: WorkspaceModulesProxy, openai: OpenAI) {
  client.emit('create-module', rootNode!, workspaceId, moduleOutlineData.name, moduleOutlineData.description, async (ack) => {
    if (ack === 'module-created') {
      console.log("Result", result);

      const serializedKey = serializeTuple([result.moduleId!, workspaceId]);
      console.log("Serialized key:", serializedKey);

      if (result.moduleId) {
        console.log("Creating module data");
        const serializedKey = serializeTuple([result.moduleId, workspaceId]);

        const moduleNodes: ModuleNode[] = moduleOutlineData.moduleNodes.map((moduleNodeOutline) => {
          const mapModuleNodeOutlineToModuleNode = (nodeOutline: ModuleNodeOutline, parentId: string): ModuleNode => {
            return {
              id: nodeOutline.id!,
              parent: parentId,
              name: nodeOutline.name,
              content: '', 
              description: nodeOutline.description,
              children: nodeOutline.children
                ? nodeOutline.children.map((childNode) => mapModuleNodeOutlineToModuleNode(childNode, nodeOutline.id!))
                : [], // Recursively map children, if any
            };
          };
        
          return mapModuleNodeOutlineToModuleNode(moduleNodeOutline, moduleOutlineData.id!); // Root-level parent id is moduleOutlineData.id
        });
        
        console.log("Module nodes:", JSON.stringify(moduleNodes, null, 2));

        const moduleBuffer: Module = {
          id: rootNode!,
          name: moduleOutlineData.name,
          description: moduleOutlineData.description,
          nodes: moduleNodes
        }

        workspaceModulesBufferProxy.set(serializedKey, moduleBuffer);

        let i = 0;
        for (const node of moduleNodes) {
          const traverseModuleNodes = async (
            moduleId: string,
            workspaceId: string,
            node: ModuleNodeOutline
          ) => {
            // Call generateModuleNodeContent for the current node sequentially
            if (node.id) {
              await generateModuleNodeContent(
                moduleId,
                node.id,
                workspaceId,
                node.name,
                node.description,
                subject,
                context_instructions,
                workspaceModulesBufferProxy,
                openai,
              );
            }
        
            // workspaceModulesBufferProxy.emit(serializedKey, 'update-module-node', moduleId, node.id, workspaceId, node.description, node.description);
            
            console.log("Iteration", i++);

            // If this node has children, recursively call traverseModuleNodes for each child
            if (node.children && node.children.length > 0) {
              for (const childNode of node.children) {
                await traverseModuleNodes(moduleId, workspaceId, childNode);
              }
            }
          };
        
          // Traverse each module node sequentially
          await traverseModuleNodes(rootNode!, workspaceId, node);
        }
        
        workspaceModulesBufferProxy.emit(serializedKey, 'end');
      }
    }
  });
}

export async function generateModuleNodeContent(moduleId: string, moduleNodeId: string, workspaceId: string, name: string, description: string, subject: string, context_instructions: string, workspaceModulesBufferProxy: WorkspaceModulesProxy, openai: OpenAI) {
  const tupleKey: WorkspaceModuleKey = [moduleId, workspaceId];
  const serializedKey = serializeTuple(tupleKey);

  let finalIntermediateResponse: string = '';

  const systemPrompt = 
  `You are an AI agent that's part of a user input processing pipeline who's main task is to generate content for a module. Focus on creating the actual content of the module node, not the outline, not the overview. Just focus on creating the content. That's all. Make sure it is well structured. Do not output the metadata as it is already displayed in another component.

  Here is the metadata for the module:

  Subject: ${subject}
  Module Name: ${name}
  Description: ${description}

  Consider the following context instructions inferred by the previous processes within the pipeline:

  Context Instructions: ${context_instructions}
  `;

  const systemPromptParam = [{ role: 'system', content: systemPrompt }] as ChatCompletionMessageParam[];

  const stream = openai.beta.chat.completions.stream({
    model: "gpt-4o-mini",
    messages: [...systemPromptParam],
  });

  const streamHandlers = {
    content: (contentDelta, contentSnapshot) => {
      const trimmedContentSnapshot = JSON.stringify(contentSnapshot).slice(1, -1);
      workspaceModulesBufferProxy.emit(serializedKey, 'update-module-node', moduleId, moduleNodeId, workspaceId, contentDelta, trimmedContentSnapshot);
    },
    finalContent: async (contentSnapshot) => {
      workspaceModulesBufferProxy.emit(serializedKey, 'finalContent', contentSnapshot, workspaceId);
      moduleController.updateModuleNodeContentCallback(moduleNodeId, contentSnapshot);
    },
    chunk: (chunk, snapshot) => {
      // console.log("Generated chunk delta: ", chunk.choices[0].delta);
      // console.log("Generated chunk snapshot: ", snapshot.choices[0].message);
      // this.workspaceModulesBufferProxy.emit(serializedKey, 'chunk', chunk, snapshot, workspaceId)
    },
    chatCompletion: async (completion) => {
      console.log("Completion: ", completion.choices[0].message);
      // const assistantTokens = await calculateTokens4o_mini(completion.choices[0].message.content);
      // const usage = {
      //   prompt_tokens: userTokens,
      //   completion_tokens: assistantTokens,
      //   total_tokens: userTokens + assistantTokens,
      // };
      // const completionWithUsage = {
      //   ...completion,
      //   usage: usage
      // };
      // client.emit('chatCompletion', completionWithUsage, workspaceId);
    },
    finalChatCompletion: async (completion) => {
      console.log("Final chat completion: ", completion.choices[0].message);
      try {
        const { document } = await chunkAndEmbedFile(
          uuid(),
          completion.choices[0].message.content!,
          '',
        ); 
        console.log("Upserting new pinecone embedding document...");
        documentController.safeUpsertDocument(
          document,
          workspaceId
        )
      } catch (error) {
        console.error("Unable to embed module node: ", error);
      }
      // const assistantTokens = await calculateTokens4o_mini(completion.choices[0].message.content);
      // const usage = {
      //   prompt_tokens: userTokens,
      //   completion_tokens: assistantTokens,
      //   total_tokens: userTokens + assistantTokens,
      // };
      // const completionWithUsage = {
      //   ...completion,
      //   usage: usage
      // };
      // client.emit('finalChatCompletion', completionWithUsage, workspaceId);
    },
    message: (message) => workspaceModulesBufferProxy.emit(serializedKey, 'message', message, workspaceId),
    finalMessage: async (message) => {
      // this.workspaceModulesBufferProxy.emit(serializedKey, 'finalMessage', message, workspaceId);
      // finalIntermediateResponse = message.content as string;
      // try {
      //   await assistantController.insertChatHistory(
      //     message,
      //     uuid(),
      //     workspaceId
      //   );
      // } catch (error) {
      //   console.error('Error inserting chat history:', error);
      // }
    },
    functionCall: (functionCall) => workspaceModulesBufferProxy.emit(serializedKey, 'functionCall', functionCall, workspaceId),
    finalFunctionCall: (finalFunctionCall) =>
      workspaceModulesBufferProxy.emit(serializedKey, 'finalFunctionCall', finalFunctionCall, workspaceId),
    functionCallResult: (finalFunctionCallResult) =>
      workspaceModulesBufferProxy.emit(serializedKey, 'finalFunctionCallResult', finalFunctionCallResult, workspaceId),
    finalFunctionCallResult: (finalFunctionCallResult, workspaceId) =>
      workspaceModulesBufferProxy.emit(serializedKey, 'finalFunctionCallResult', finalFunctionCallResult, workspaceId),
    error: (error) => {
      workspaceModulesBufferProxy.emit(serializedKey, 'error', error, workspaceId);
    },
    end: () => {
      // this.workspaceMessagesBufferProxy.emit(serializedKey, 'end');
    },
  } as ChatCompletionEvents;

  Object.entries(streamHandlers).forEach(([event, handler]) => {
    stream.on(
      event as keyof typeof streamHandlers,
      async (...args: any) => {
        // this.logger(
        //   `Event: ${event}, Args: ${JSON.stringify(args, null, 2)}`,
        // );
        await handler(...args);
      },
    );
  });

  // Wait until the stream is finished before returning the final response
  return new Promise<string>((resolve, reject) => {
    stream.on('end', () => {
      resolve(finalIntermediateResponse);
    });
    stream.on('error', (error: any) => {
      reject(error);
    });
  });
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

//////////////////////////////////////
/////////// Miscellaneous ////////////
//////////////////////////////////////

export async function generateDirective(client: Client, messageType: MessageType, workspaceId: string, role: "user" | "assistant", directive: string): Promise<Result<void>> {
  return new Promise<Result<void>>(async (resolve, reject) => {
    const assistantMessageId = uuid();

    client.emit('initialize-assistant-message', assistantMessageId, messageType, workspaceId, async ({ ack }) => {
      console.log("Ack user message: ", ack);
      if (ack !== 'success') {
        reject(Result.err(new Error(`Error processing pipeline: Failed to create message.`)));
        return; // Early return
      }

      client.emit('finalContent', directive, assistantMessageId, workspaceId);

      const insertResult = await assistantController.insertChatHistory(
          {
            role: role,
            content: directive,
          },
          assistantMessageId,
          messageType,
          workspaceId
      );

      if (insertResult.isError()) {
        reject(Result.err(new Error(`Error generating directive: ${insertResult.error}`)));
      }

      resolve(Result.ok(undefined));
    });
  });
}

//////////////////////////////////////
////// Pipeline Synchronization //////
//////////////////////////////////////

/**
 * Wait for a specific event from the Socket.IO server.
 * @param {SocketIO} io - SocketIO connection object.
 * @param {keyof EmitEvents} event - The event type to listen for.
 * @returns {Promise<Result<T>>} - A promise that resolves with the event data wrapped in Result.
 */
export async function waitForSocketEvent<T>(io: Client, event: keyof EventsMap): Promise<Result<T>> {
  return new Promise<Result<T>>((resolve, reject) => {
    console.log("Waiting for event: ", event);
    // Define the listener function
    const listener = (data: T) => {
      clearTimeout(timeout); // Clear the timeout when the event occurs
      io.off(event, listener); // Remove the listener
      console.log("Got event: ", event);
      resolve(Result.ok(data)); // Wrap the resolved data in Result.ok
    };

    // Implement a timeout to reject the promise if the event doesn't occur
    const timeout = setTimeout(() => {
      io.off(event, listener); // Remove the listener if timeout occurs
      reject(Result.err(new Error(`Timeout waiting for event: ${event}`))); // Wrap the timeout error in Result.err
    }, 5000); // Wait for 5 seconds

    // Attach the listener
    io.once(event, listener);
  });
}