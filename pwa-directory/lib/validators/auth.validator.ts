import { z } from "zod";

/**
 * Common password complexity regex and rules matching the existing signup form:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character
 */
export const PasswordRuleSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter")
  .regex(/[a-z]/, "Password must include at least one lowercase letter")
  .regex(/[0-9]/, "Password must include at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must include at least one special character");

/**
 * Login validation schema.
 */
export const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email address is required")
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  companyWebsite: z.string().max(0, "Invalid form submission").optional(), // Honeypot
});

export type LoginInput = z.infer<typeof LoginSchema>;

/**
 * Signup validation schema with name normalization and password matching.
 */
export const SignupSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, "First name is required")
      .max(50, "First name is too long"),
    middleName: z
      .string()
      .trim()
      .max(50, "Middle name is too long")
      .optional()
      .default(""),
    lastName: z
      .string()
      .trim()
      .min(1, "Last name is required")
      .max(50, "Last name is too long"),
    extensionName: z
      .enum(["None", "Jr.", "Sr.", "II", "III", "IV", "V", ""])
      .optional()
      .default("None"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Email address is required")
      .email("Please enter a valid email address"),
    password: PasswordRuleSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
    companyWebsite: z.string().max(0, "Invalid form submission").optional(), // Honeypot
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupInput = z.infer<typeof SignupSchema>;

/**
 * Forgot password validation schema.
 */
export const ForgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email address is required")
    .email("Please enter a valid email address"),
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

