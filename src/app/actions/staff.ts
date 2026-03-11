"use server";

import { createClient } from "@supabase/supabase-js";

// Initialize the Supabase admin client using the service role key
// This bypasses RLS and allows creating users without modifying the current session
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function createStaffMember(formData: FormData, restaurantId: string) {
  try {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as string; // 'waiter', 'kitchen', 'manager'

    if (!name || !email || !password || !role || !restaurantId) {
      return { error: "Todos os campos são obrigatórios." };
    }

    // 1. Create user in Supabase Auth (auth.users)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for easy login
    });

    if (authError) {
      console.error("Auth Admin Error:", authError);
      return { error: authError.message };
    }

    if (!authData.user) {
      return { error: "Erro desconhecido ao criar usuário de autenticação." };
    }

    // 2. Insert profile in public.users linked to the restaurant
    const { error: dbError } = await supabaseAdmin.from("users").insert([
      {
        id: authData.user.id,
        restaurant_id: restaurantId,
        name,
        role,
      },
    ]);

    if (dbError) {
      console.error("Database Profile Error:", dbError);
      // Rollback user creation
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return { error: dbError.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Catch Error:", err);
    return { error: err.message || "Erro interno no servidor." };
  }
}
