import { AuthForm } from "@/components/auth/auth-form";
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const query = await searchParams;
  return (
    <AuthForm
      mode="signin"
      next={query.next ?? "/account"}
      initialError={
        query.error ? "Sign-in could not be completed. Please try again." : ""
      }
    />
  );
}
