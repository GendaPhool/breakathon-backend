// ============================================================
// src/modules/registrations/registrations.validation.js
// ============================================================

const { z } = require("zod");

const OCCUPATIONS = ["Student", "Working Professional", "Freelancer", "Founder", "Other"];
const HOW_HEARD   = ["Instagram", "WhatsApp", "Friend", "College", "Startup Community", "LinkedIn", "Other"];

const createRegistrationSchema = z.object({
  name:               z.string().min(1, "Name is required").max(120),
  email:              z.string().email("Enter a valid email"),
  phone:              z
    .string()
    .regex(/^\d{10}$/, "Enter a valid 10-digit phone number"),
  city:               z.string().min(1, "City is required").max(100),
  occupation:         z.enum(OCCUPATIONS, { errorMap: () => ({ message: "Please select your occupation" }) }),
  how_did_you_hear:   z.enum(HOW_HEARD,   { errorMap: () => ({ message: "Please tell us how you heard about us" }) }),
  payment_reference:  z.string().min(1, "Payment reference is required"),

  // Fields the frontend sends but we override on the server — accept & ignore them
  payment_status:     z.string().optional(),
  checked_in:         z.boolean().optional(),
  badge_printed:      z.boolean().optional(),
});

module.exports = { createRegistrationSchema };
