/** JSON schema untuk structured output deteksi balon manga. */
export const MANGA_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    bubbles: {
      type: "array",
      items: {
        type: "object",
        properties: {
          box_2d: {
            type: "array",
            items: { type: "integer" },
            minItems: 4,
            maxItems: 4,
          },
          original: { type: "string" },
          translation: { type: "string" },
          type: { type: "string", enum: ["dialog", "narasi", "sfx"] },
        },
        required: ["box_2d", "original", "translation", "type"],
      },
    },
  },
  required: ["bubbles"],
};

export const MANGA_USER_PROMPT =
  "Deteksi semua teks di halaman ini dan terjemahkan ke Bahasa Indonesia sesuai aturan. Balas hanya JSON sesuai schema.";
