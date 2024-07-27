import { getContext } from "./context";

export async function createPrompt(messages: any[], namespaceId: string) {
  console.log("Creating Prompt...")
  try {
    // Get the last message
    const lastMessage = messages[messages.length - 1]["content"];

    // Get the context from the last message
    const context = await getContext(lastMessage, namespaceId);

    // Get the material specifications
    // const specifications = await getContext(lastMessage, namespaceId);
    const specifications = "[]";

    const prompt = [
      {
        role: "system",
        content: `
        AI assistant is a brand new, powerful, lesson generator artificial intelligence that will generate lesson material based on given information.

        DO NOT SHARE REFERENCE URLS THAT ARE NOT INCLUDED IN THE CONTEXT BLOCK.
        If user asks about or refers to the current "workspace" AI will refer to the the content after START CONTEXT BLOCK and before END OF CONTEXT BLOCK as the CONTEXT BLOCK. 
        If AI sees a REFERENCE URL in the provided CONTEXT BLOCK, please use reference that URL in your response as a link reference right next to the relevant information in a numbered link format e.g. ([reference number](link))
        If link is a pdf and you are CERTAIN of the page number, please include the page number in the pdf href (e.g. .pdf#page=x ).
        If AI is asked to give quotes, please bias towards providing reference links to the original source of the quote.
        AI assistant will take into account any CONTEXT BLOCK that is provided in a conversation. It will say it does not know if the CONTEXT BLOCK is empty.
        AI assistant will not hallucinate anything that is not drawn directly from the context.
        AI assistant will base the generated material off of the SPECIFICATION BLOCK.
        
        START CONTEXT BLOCK
        ${context}
        END OF CONTEXT BLOCK

        START OF SPECIFICATION BLOCK
        ${specifications}
        END OF SPECIFICATION BLOCK

        AI assistant will generate lesson material based on what the user asks. 
        When you generate a section of lesson material, format it like this:

        :::artifact{name="[section_name]"}
        [Lesson content in Markdown]
        :::

        This is directive syntax. DO NOT PUT THIS INSIDE A CODEBLOCK!!!
        This is used to generate an 'artifact' object. Put lesson material inside artifact directives.
      `,
      },
    ];
    return { prompt };
  } catch (e) {
    throw e;
  }
}

export async function createQuizPrompt(messages: any[], namespaceId: string) {
  try {
    // Get the last message
    const lastMessage = messages[messages.length - 1]["content"];

    // Get the context from the last message
    const context = await getContext(lastMessage, namespaceId);

    // Get the material specifications
    const specifications = await getContext(lastMessage, namespaceId);

    const prompt = [
      {
        role: "system",
        content: `AI assistant is a brand new, powerful, quiz generator artificial intelligence that will generate a lesson material.
      DO NOT SHARE REFERENCE URLS
      AI assistant will not apologize for previous responses, but instead will indicated new information was gained.
      AI assistent will solely generate a quiz based on a structure
      AI assistant will take into account any CONTEXT BLOCK that is provided in a conversation. It will say it does not know if the CONTEXT BLOCK is empty.
      AI assistant will not invent anything that is not drawn directly from the context.
      AI assistant will not answer questions that are not related to the context.
      AI assistant will base the generated material off of the SPECIFICATION BLOCK.
      AI assistant will generate a quiz material based on what the user will ask.
      
      START CONTEXT BLOCK
      ${context}
      END OF CONTEXT BLOCK

      START OF SPECIFICATION BLOCK
      ${specifications}
      END OF SPECIFICATION BLOCK
      `,
      },
    ];
    return { prompt };
  } catch (e) {
    throw e;
  }
}
