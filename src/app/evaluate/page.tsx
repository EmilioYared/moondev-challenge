import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import EvaluationList from '@/components/evaluate/EvaluationList'

export default async function EvaluatePage() {
  const supabase = createServerComponentClient({ cookies })
  
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return redirect('/')
  }
  
  // Check if user is an evaluator
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single()
    
  if (userData?.role !== 'evaluator') {
    return redirect('/')
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Developer Submissions</h1>
      <EvaluationList />
    </div>
  )
}