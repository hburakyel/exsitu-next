export const env = {
  STRAPI_API_TOKEN: process.env.STRAPI_API_TOKEN || "",
  STRAPI_WEBHOOK_TOKEN: process.env.STRAPI_WEBHOOK_TOKEN || "",
  VERCEL_ENV: process.env.VERCEL_ENV || "development",
}
