export const name = "hello-plugin";

export function apply(ctx) {
  ctx.effect(() => {
    console.log("[hello-plugin] loaded");
    return () => console.log("[hello-plugin] unloaded");
  });
}
