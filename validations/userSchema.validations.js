const Joi = require("joi");
const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),

  email: Joi.string()
    .email({ tlds: { allow: true } })
    .min(5)
    .max(100)
    .required(),

  password: Joi.string()
    .pattern(passwordPattern)
    .message(
      "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character."
    )
    .required(),
});

const loginSchema = Joi.object({
  emailOrUsername: Joi.string()
    .min(3)
    .max(100)
    .required()
    .custom((value, helpers) => {
      const isEmail = Joi.string()
        .email({ tlds: { allow: true } })
        .validate(value);
      const isUsername = Joi.string().alphanum().min(3).max(30).validate(value);

      if (isEmail.error && isUsername.error) {
        return helpers.error("any.invalid");
      }
      return value;
    }, "Username or Email Validation")
    .messages({
      "any.invalid": "Must be a valid email or username.",
    }),

  password: Joi.string()
    .pattern(passwordPattern)
    .message(
      "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character."
    )
    .required(),
});

module.exports = { registerSchema, loginSchema };
