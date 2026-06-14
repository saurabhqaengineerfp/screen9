import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import AdminLogin from "./AdminLogin";
import AdminClient from "./AdminClient";

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get("admin_auth")?.value === "true";

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  const supabase = await createClient();
  const { data: movies } = await supabase
    .from('movies')
    .select('id, title, release_year')
    .order('created_at', { ascending: false });

  return <AdminClient initialMovies={movies || []} />;
}
