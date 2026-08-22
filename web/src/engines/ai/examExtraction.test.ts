import { describe, expect, it } from "vitest";
import { extractLabMarkersFromImage } from "./examExtraction";
import type { AIProvider } from "./types";

function fakeProvider(response: string): AIProvider {
  return {
    name: "fake",
    async complete() {
      return "";
    },
    async *stream() {},
    async completeWithImage() {
      return response;
    },
  };
}

const IMAGE = { mimeType: "image/jpeg", base64: "aGVsbG8=" };

describe("extractLabMarkersFromImage", () => {
  it("valida e devolve os marcadores de uma resposta JSON limpa", async () => {
    const provider = fakeProvider(
      '[{"marker":"vitamin_d","value":28.5,"unit":"ng/mL","referenceMin":30,"referenceMax":100}]',
    );
    const markers = await extractLabMarkersFromImage(provider, IMAGE);
    expect(markers).toEqual([
      { marker: "vitamin_d", value: 28.5, unit: "ng/mL", referenceMin: 30, referenceMax: 100 },
    ]);
  });

  it("aceita campos nulos quando a IA não achou unidade/faixa", async () => {
    const provider = fakeProvider(
      '[{"marker":"ferritin","value":80,"unit":null,"referenceMin":null,"referenceMax":null}]',
    );
    const markers = await extractLabMarkersFromImage(provider, IMAGE);
    expect(markers).toEqual([
      { marker: "ferritin", value: 80, unit: null, referenceMin: null, referenceMax: null },
    ]);
  });

  it("remove cerca de código markdown antes de fazer parse", async () => {
    const provider = fakeProvider(
      '```json\n[{"marker":"glucose","value":90,"unit":"mg/dL","referenceMin":70,"referenceMax":99}]\n```',
    );
    const markers = await extractLabMarkersFromImage(provider, IMAGE);
    expect(markers).toHaveLength(1);
    expect(markers[0].marker).toBe("glucose");
  });

  it("devolve array vazio quando o laudo não tem marcador legível", async () => {
    const provider = fakeProvider("[]");
    const markers = await extractLabMarkersFromImage(provider, IMAGE);
    expect(markers).toEqual([]);
  });

  it("lança erro quando a resposta não é JSON válido", async () => {
    const provider = fakeProvider("desculpe, não consigo ler essa imagem");
    await expect(extractLabMarkersFromImage(provider, IMAGE)).rejects.toThrow(
      "a IA não retornou um JSON válido",
    );
  });

  it("lança erro quando o JSON não bate com o schema esperado", async () => {
    const provider = fakeProvider('[{"marker":"vitamin_d"}]');
    await expect(extractLabMarkersFromImage(provider, IMAGE)).rejects.toThrow(
      "a IA retornou um formato inesperado",
    );
  });
});
