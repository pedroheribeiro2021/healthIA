import { z } from "zod";
import { isoDateTimeSchema as isoDateTime } from "./shared";

export const macrosSchema = z.object({
  kcal: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
});
export type Macros = z.infer<typeof macrosSchema>;

// Base de alimentos (docs/ROADMAP.md Fase 5: seed curado TACO/TBCA) —
// `per100g` são os macros por 100g, unidade universal de referência
// nutricional (equivalente ao "SI" desse domínio).
export const foodSchema = z.object({
  id: z.number(),
  name: z.string(),
  per100g: macrosSchema,
});
export type Food = z.infer<typeof foodSchema>;

export const recipeSourceSchema = z.enum(["manual", "ai_suggested"]);
export type RecipeSource = z.infer<typeof recipeSourceSchema>;

export const recipeSchema = z.object({
  id: z.number(),
  name: z.string(),
  servings: z.number(),
  instructions: z.string().nullable(),
  source: recipeSourceSchema,
  archived: z.boolean(),
  createdAt: isoDateTime,
});
export type Recipe = z.infer<typeof recipeSchema>;

export const newRecipeInputSchema = z.object({
  name: z.string().min(1).max(200),
  servings: z.number().positive().max(100).default(1),
  instructions: z.string().max(5000).optional(),
});
export type NewRecipeInput = z.infer<typeof newRecipeInputSchema>;

// Macros já congelados no momento em que o ingrediente foi adicionado
// (docs/DATA_MODEL.md: colunas kcal/protein_g/carbs_g/fat_g em
// recipe_ingredients, não uma FK viva pra `foods`) — se o valor do
// alimento na base mudar depois, a receita já cadastrada não é afetada.
export const recipeIngredientSchema = z.object({
  id: z.number(),
  recipeId: z.number(),
  foodName: z.string(),
  quantity: z.number(),
  unit: z.string(),
  kcal: z.number().nullable(),
  proteinG: z.number().nullable(),
  carbsG: z.number().nullable(),
  fatG: z.number().nullable(),
});
export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>;

export const newRecipeIngredientSchema = recipeIngredientSchema.omit({ id: true });
export type NewRecipeIngredient = z.infer<typeof newRecipeIngredientSchema>;

// Entrada da rota (docs/ENGINES.md `POST /api/v1/recipes/{id}/ingredients`)
// — só referencia o alimento da base + quantidade; o serviço resolve o
// nome/macros (engines/nutrition/recipeService.ts).
export const addIngredientInputSchema = z.object({
  foodId: z.number().int().positive(),
  quantityG: z.number().positive().max(10000),
});
export type AddIngredientInput = z.infer<typeof addIngredientInputSchema>;

export const shoppingListStatusSchema = z.enum(["open", "bought"]);
export type ShoppingListStatus = z.infer<typeof shoppingListStatusSchema>;

export const shoppingListItemSchema = z.object({
  id: z.number(),
  foodName: z.string(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  status: shoppingListStatusSchema,
  originRecipeId: z.number().nullable(),
  createdAt: isoDateTime,
});
export type ShoppingListItem = z.infer<typeof shoppingListItemSchema>;

export const newShoppingListItemInputSchema = z.object({
  foodName: z.string().min(1).max(200),
  quantity: z.number().positive().optional(),
  unit: z.string().max(30).optional(),
});
export type NewShoppingListItemInput = z.infer<typeof newShoppingListItemInputSchema>;
