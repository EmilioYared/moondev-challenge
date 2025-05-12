import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import SubmitForm from '@/components/auth/SubmitForm'

export default async function SubmitPage() {
  const supabase = createServerComponentClient({ cookies })
  
  // Check authentication
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (!session || sessionError) {
    return redirect('/')
  }
  
  // Check if user is a developer
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single()
    
  if (userError || userData?.role !== 'developer') {
    return redirect('/')
  }
  
  // Check if user has already submitted
  const { data: existingSubmission } = await supabase
    .from('submissions')
    .select('id')
    .eq('user_id', session.user.id)
    .single()
    
  if (existingSubmission) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-700">
            You have already submitted your application. Please wait for review.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Developer Application</h1>
      <div className="bg-white shadow-md rounded-lg p-6">
        <SubmitForm 
          userId={session.user.id} 
          userEmail={session.user.email || ''} 
        />
      </div>
    </div>
  )
}