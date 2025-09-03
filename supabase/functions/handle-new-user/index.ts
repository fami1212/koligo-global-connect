import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { user, metadata } = await req.json()

    if (!user) {
      throw new Error('No user data provided')
    }

    // Create profile
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .insert({
        user_id: user.id,
        email: user.email,
        first_name: metadata?.first_name || null,
        last_name: metadata?.last_name || null,
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      throw profileError
    }

    // Assign role based on user_type
    const userType = metadata?.user_type || 'sender'
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: userType,
      })

    if (roleError) {
      console.error('Role assignment error:', roleError)
      throw roleError
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in handle-new-user:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})