import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsString, ValidateNested } from 'class-validator'
import ChoiceModel from './choiceModel'

/**
 * @description Quiz model with class validator so AI can create a structured data
 * based on this class with validator so generation can fail if AI doesnt follow the structure
 */
class QuizModel {

  @IsString()
  question: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ChoiceModel)
  choices: ChoiceModel[];

  constructor(question: string, choices: ChoiceModel[]) {
    this.question = question
    this.choices = choices
  }
}

export default QuizModel

/* NOTE: Example of generating a structured data from OpenAI using JavaScript

import { Configuration, OpenAIApi } from "openai";
import { validateOrReject, plainToClass } from "class-validator";
import { plainToInstance } from "class-transformer";

/// Configure OpenAI API
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY, /// Make sure to set your OpenAI API key
});
const openai = new OpenAIApi(configuration);

class Address {
  @IsString()
  street: string;

  @IsString()
  city: string;

  @IsString()
  country: string;

  constructor(street: string, city: string, country: string) {
    this.street = street;
    this.city = city;
    this.country = country;
  }
}

class User {
  @IsString()
  name: string;

  @IsInt()
  age: number;

  @ValidateNested({ each: true })
  @Type(() => Address)
  address: Address;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => Address)
  addresses: Address[];

  constructor(name: string, age: number, address: Address, addresses: Address[]) {
    this.name = name;
    this.age = age;
    this.address = address;
    this.addresses = addresses;
  }
}

async function generateUserData(): Promise<User> {
  /// Prompt OpenAI to generate structured data
  const prompt = `Generate a JSON object with the following structure:
{
  "name": "string",
  "age": integer,
  "address": {
    "street": "string",
    "city": "string",
    "country": "string"
  },
  "addresses": [
    {
      "street": "string",
      "city": "string",
      "country": "string"
    },
    {
      "street": "string",
      "city": "string",
      "country": "string"
    }
  ]
}`;
  const response = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: prompt,
    max_tokens: 300,
  });

  const data = JSON.parse(response.data.choices[0].text.trim());

  /// Create a User instance using plainToInstance for nested classes
  const user = plainToInstance(User, data);

  /// Validate the User instance
  await validateOrReject(user);

  return user;
}

(async () => {
  try {
    const user = await generateUserData();
    console.log("Generated user:", user);
  } catch (errors) {
    console.log("Validation failed. Errors:", errors);
  }
})();
 */