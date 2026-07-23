const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Password requerido')
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10)
});

const forgotSchema = z.object({
  email: z.string().email('Email inválido')
});

const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, 'Password mínimo 8 caracteres') // era 6
});

module.exports = {
  loginSchema,
  refreshSchema,
  forgotSchema,
  resetSchema
};
