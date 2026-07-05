export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === "/login") {
    return;
  }

  const { $supabase } = useNuxtApp();

  const {
    data: { session },
  } = await $supabase.auth.getSession();

  if (!session) {
    return navigateTo({
      path: "/login",
      query: { redirect: to.fullPath },
    });
  }
});
