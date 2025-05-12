"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import toast from 'react-hot-toast'

interface Submission {
  id: string
  user_id: string
  full_name: string
  email: string
  phone_number: string
  location: string
  hobbies: string
  profile_picture_url: string
  source_code_url: string
  status: 'pending' | 'accepted' | 'rejected'
  feedback: string | null
  created_at: string
}

export default function EvaluationList() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchSubmissions()
    setupRealtimeSubscription()
  }, [])

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSubmissions(data || [])
    } catch (error: any) {
      toast.error('Failed to load submissions')
      console.error('Error:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('submissions-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'submissions' 
        },
        (payload) => {
          if (payload.new) {
            setSubmissions(current => 
              current.map(sub => 
                sub.id === payload.new.id ? payload.new : sub
              )
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error('Download failed')
      
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      toast.error('Failed to download file')
    }
  }

  const updateSubmission = async (id: string, status: 'accepted' | 'rejected') => {
    const feedback = feedbackMap[id]
    if (!feedback?.trim()) {
      toast.error('Please provide feedback before making a decision')
      return
    }

    try {
      const { error } = await supabase
        .from('submissions')
        .update({ 
          status, 
          feedback 
        })
        .eq('id', id)

      if (error) throw error

      // Send notification via API route
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: id,
          action: status,
          feedback
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send notification')
      }

      toast.success(`Candidate ${status === 'accepted' ? 'accepted' : 'rejected'} successfully`)
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to update submission')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No submissions found
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {submissions.map((submission) => (
        <div key={submission.id} className="bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Developer Info */}
            <div>
              <div className="relative h-48 w-48 mx-auto mb-4">
                <Image
                  src={submission.profile_picture_url}
                  alt={submission.full_name}
                  fill
                  className="rounded-lg object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold text-center mb-4">
                {submission.full_name}
              </h3>
              <div className="space-y-2">
                <p><strong>Email:</strong> {submission.email}</p>
                <p><strong>Phone:</strong> {submission.phone_number}</p>
                <p><strong>Location:</strong> {submission.location}</p>
                <p><strong>Hobbies:</strong> {submission.hobbies}</p>
              </div>
            </div>

            {/* Evaluation Section */}
            <div className="space-y-4">
              <button
                onClick={() => handleDownload(
                  submission.source_code_url,
                  `${submission.full_name.replace(/\s+/g, '-')}-source.zip`
                )}
                className="w-full py-2 px-4 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
              >
                Download Source Code
              </button>

              {submission.status === 'pending' ? (
                <>
                  <textarea
                    value={feedbackMap[submission.id] || ''}
                    onChange={(e) => setFeedbackMap(prev => ({
                      ...prev,
                      [submission.id]: e.target.value
                    }))}
                    placeholder="Enter your feedback for the candidate..."
                    className="w-full p-3 border rounded-md h-32 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => updateSubmission(submission.id, 'accepted')}
                      className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      Welcome to the Team
                    </button>
                    <button
                      onClick={() => updateSubmission(submission.id, 'rejected')}
                      className="w-full py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      We Are Sorry
                    </button>
                  </div>
                </>
              ) : (
                <div className={`p-4 rounded-md ${
                  submission.status === 'accepted' 
                    ? 'bg-green-50 text-green-800' 
                    : 'bg-red-50 text-red-800'
                }`}>
                  <p className="font-semibold">
                    Status: {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                  </p>
                  <p className="mt-2">Feedback: {submission.feedback}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}