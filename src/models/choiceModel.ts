import { IsBoolean, IsString } from "class-validator";

/**
 * @description Model for multiple choice question
 */
class ChoiceModel {

  @IsString()
  content: string

  @IsBoolean()
  correct: boolean

  constructor(content: string, correct: boolean) {
    this.content = content
    this.correct = correct
  }
}

export default ChoiceModel