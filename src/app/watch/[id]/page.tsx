import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import WatchClient from "./WatchClient";

export const dynamic = 'force-dynamic';

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const supabase = await createClient();
  const { data: movie, error } = await supabase
    .from('movies')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !movie) {
    return <div style={{padding: "100px", color: "white"}}>
      <h1>Error loading movie</h1>
      <pre>{JSON.stringify(error, null, 2)}</pre>
      <pre>Params ID: {id}</pre>
    </div>;
  }

  return <WatchClient movie={movie} />;
}
