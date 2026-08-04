import { z } from "zod";
import { DEFAULT_ANGLE } from "@/lib/colorStyle";

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const colorSchema = z
  .object({
    name: z.string().trim().min(1, { message: "Name is required" }).max(60),
    type: z.enum(["SOLID", "GRADIENT", "CHECK", "IMAGE"]).default("SOLID"),
    value: z.string().trim().regex(HEX_COLOR, { message: "Hex value must look like #1a2b3c" }),
    value2: z.string().trim().optional().nullable(),
    angle: z.coerce.number().int().min(0).max(360).optional().nullable(),
    image: z.string().trim().optional().nullable(),
  })
  .refine((d) => !["GRADIENT", "CHECK"].includes(d.type) || HEX_COLOR.test(d.value2 ?? ""), {
    message: "A valid second hex value is required for gradient and check swatches",
    path: ["value2"],
  })
  .refine((d) => d.type !== "IMAGE" || !!d.image, {
    message: "Upload a fabric photo for an image swatch",
    path: ["image"],
  })
  .transform((d) => ({
    name: d.name,
    type: d.type,
    value: d.value.toLowerCase(),
    value2: d.type === "GRADIENT" || d.type === "CHECK" ? d.value2!.toLowerCase() : null,
    angle: d.type === "GRADIENT" ? d.angle ?? DEFAULT_ANGLE : null,
    image: d.type === "IMAGE" ? d.image! : null,
  }));

export const stockAlertSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  variantId: z.string().min(1, { message: "Variant ID is required" }),
});

export const reviewSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters long" }).max(50),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10, { message: "Review must be at least 10 characters long" }).max(500),
});

export const qaSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters long" }).max(50),
  email: z.string().email({ message: "Invalid email address" }),
  question: z.string().min(10, { message: "Question must be at least 10 characters long" }).max(500),
});
