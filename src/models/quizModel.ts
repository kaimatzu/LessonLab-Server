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