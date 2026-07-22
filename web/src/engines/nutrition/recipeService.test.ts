import { describe, expect, it } from "vitest";
import type {
  Food,
  NewRecipeIngredient,
  NewRecipeInput,
  Recipe,
  RecipeIngredient,
} from "@/domain/nutrition";
import type { FoodRepository, RecipeRepository } from "@/domain/repositories";
import { addIngredientToRecipe, getRecipeWithMacros } from "./recipeService";

function createFakeFoodRepository(foods: Food[]): FoodRepository {
  return {
    async searchFoods(query) {
      return foods.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()));
    },
    async getFoodById(id) {
      return foods.find((f) => f.id === id) ?? null;
    },
  };
}

function createFakeRecipeRepository(recipes: Recipe[]): RecipeRepository & {
  ingredients: RecipeIngredient[];
} {
  const ingredients: RecipeIngredient[] = [];
  let nextIngredientId = 1;

  return {
    ingredients,
    async createRecipe(input: NewRecipeInput) {
      throw new Error(`não usado neste teste: ${input.name}`);
    },
    async listRecipes() {
      return recipes;
    },
    async getRecipe(id) {
      return recipes.find((r) => r.id === id) ?? null;
    },
    async addIngredient(ingredient: NewRecipeIngredient) {
      const row: RecipeIngredient = { id: nextIngredientId++, ...ingredient };
      ingredients.push(row);
      return row;
    },
    async listIngredients(recipeId) {
      return ingredients.filter((i) => i.recipeId === recipeId);
    },
  };
}

const rice: Food = { id: 1, name: "Arroz branco cozido", per100g: { kcal: 128, proteinG: 2.5, carbsG: 28, fatG: 0.2 } };
const chicken: Food = { id: 2, name: "Peito de frango grelhado", per100g: { kcal: 159, proteinG: 32, carbsG: 0, fatG: 2.5 } };

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 1,
    name: "Marmita",
    servings: 2,
    instructions: null,
    source: "manual",
    archived: false,
    createdAt: "2026-07-21T10:00:00.000Z",
    ...overrides,
  };
}

describe("addIngredientToRecipe", () => {
  it("resolve o alimento e congela os macros da quantidade informada", async () => {
    const foodRepo = createFakeFoodRepository([rice]);
    const recipeRepo = createFakeRecipeRepository([recipe()]);

    const ingredient = await addIngredientToRecipe(foodRepo, recipeRepo, 1, {
      foodId: 1,
      quantityG: 200,
    });

    expect(ingredient.foodName).toBe("Arroz branco cozido");
    expect(ingredient.quantity).toBe(200);
    expect(ingredient.unit).toBe("g");
    expect(ingredient.kcal).toBe(256);
    expect(ingredient.proteinG).toBe(5);
  });

  it("lança erro quando o alimento não existe na base", async () => {
    const foodRepo = createFakeFoodRepository([]);
    const recipeRepo = createFakeRecipeRepository([recipe()]);

    await expect(
      addIngredientToRecipe(foodRepo, recipeRepo, 1, { foodId: 999, quantityG: 100 }),
    ).rejects.toThrow(/não encontrado/);
  });
});

describe("getRecipeWithMacros", () => {
  it("soma os macros dos ingredientes e divide pelas porções", async () => {
    const foodRepo = createFakeFoodRepository([rice, chicken]);
    const recipeRepo = createFakeRecipeRepository([recipe({ servings: 2 })]);

    await addIngredientToRecipe(foodRepo, recipeRepo, 1, { foodId: 1, quantityG: 200 });
    await addIngredientToRecipe(foodRepo, recipeRepo, 1, { foodId: 2, quantityG: 150 });

    const result = await getRecipeWithMacros(recipeRepo, 1);

    // arroz 200g: kcal 256, protein 5 | frango 150g: kcal 238.5, protein 48
    expect(result?.totalMacros.kcal).toBeCloseTo(494.5, 5);
    expect(result?.totalMacros.proteinG).toBeCloseTo(53, 5);
    expect(result?.perServingMacros.kcal).toBeCloseTo(247.25, 5);
    expect(result?.ingredients).toHaveLength(2);
  });

  it("retorna null pra receita inexistente", async () => {
    const recipeRepo = createFakeRecipeRepository([]);
    expect(await getRecipeWithMacros(recipeRepo, 999)).toBeNull();
  });

  it("ignora ingredientes sem macros conhecidos na soma", async () => {
    const recipeRepo = createFakeRecipeRepository([recipe({ servings: 1 })]);
    await recipeRepo.addIngredient({
      recipeId: 1,
      foodName: "Tempero a gosto",
      quantity: 1,
      unit: "unidade",
      kcal: null,
      proteinG: null,
      carbsG: null,
      fatG: null,
    });

    const result = await getRecipeWithMacros(recipeRepo, 1);
    expect(result?.totalMacros).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  });
});
