const validate = (validateSchema) => {
  return (req, res, next) => {
    const { error } = validateSchema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return res.status(400).json({
        message: "Validation failed",
        errors,
      });
    }
    next();
  };
};

module.exports = validate;
