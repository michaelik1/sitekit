export default defineEventHandler(() => {
  return { ok: true, endpoint: "register", accepts: ["POST"] };
});
