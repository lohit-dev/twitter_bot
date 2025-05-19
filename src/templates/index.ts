import { SuccessfulOrder } from "../types";
import { TemplateName } from "../utils/image_generator";
import { ImageTemplate } from "./base";
import { GardenOrderTemplate } from "./garden_order";

const templates: Record<string, ImageTemplate> = {
  garden: new GardenOrderTemplate(),
};

export function getTemplate(name: string): ImageTemplate {
  const template = templates[name];
  if (!template) {
    throw new Error(
      `Template '${name}' not found. Available templates: ${Object.keys(templates).join(", ")}`
    );
  }
  return template;
}

export function listTemplates(): ImageTemplate[] {
  return Object.values(templates);
}

export async function generateImage(
  templateName: TemplateName,
  OrderData: SuccessfulOrder
): Promise<string> {
  const template = getTemplate(templateName);
  return template.generate(OrderData);
}

export { ImageTemplate };
