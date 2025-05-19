import { SuccessfulOrder } from "../types";

export interface ImageTemplate {
  name: string;
  description: string;
  generate(
    OrderData: SuccessfulOrder
  ): Promise<string>;
}

export interface TemplateOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
  textColor?: string;
}
