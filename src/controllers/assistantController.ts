import { Request, Response } from "express";
import { getDbConnection } from "../utils/storage/database";

class AssistantController {

  constructor() {

  }

  /**
   * Processes the user's prompt
   * 
   * @param prompt The user's prompt to the assistant.
   */
  async processPrompt(prompt: string) {
    console.log("prompt:", prompt);
    
  }
}