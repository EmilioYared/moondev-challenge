"use client"

import { useState, useEffect } from 'react'
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

  useEffect(() => {
    console.log("SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("Current submissions:", submissions);
    
    // Test supabase connection
    supabase
      .from('submissions')
      .select('count')
      .then(({ data, error }) => {
        if (error) {
          console.error("Supabase connection error:", error);
        } else {
          console.log("Supabase connected successfully:", data);
        }
      });
  }, []);

  const fetchSubmissions = async () => {
    try {
      console.log("Fetching submissions...");
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log("Submissions fetched:", data);
      setSubmissions(data || []);
    } catch (error: any) {
      console.error('Error fetching submissions:', error.message);
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }

  const setupRealtimeSubscription = () => {
  const channel = supabase
    .channel('submissions-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'submissions' },
      (payload) => {
        const newSubmission = payload.new as Submission
        if (newSubmission) {
          setSubmissions((current) =>
            current.some((sub) => sub.id === newSubmission.id)
              ? current.map((sub) =>
                  sub.id === newSubmission.id ? newSubmission : sub
                )
              : [newSubmission, ...current]
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
      // Log the URL for debugging
      console.log("Attempting to download from:", url);
      
      // Get a direct download URL from Supabase
      const fileNameEncoded = encodeURIComponent(fileName);
      const downloadUrl = `${url}?download=${fileNameEncoded}`;
      
      // Open in new window/tab for direct download
      window.open(downloadUrl, '_blank');
      
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  }

  const updateSubmission = async (id: string, status: 'accepted' | 'rejected') => {
    const feedback = feedbackMap[id];
    if (!feedback?.trim()) {
      toast.error('Please provide feedback before making a decision');
      return;
    }

    try {
      // Update submission in database first
      const { error } = await supabase
        .from('submissions')
        .update({ 
          status, 
          feedback 
        })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Submission status updated to ${status}`);

      // Send email notification
      try {
        const response = await fetch('/api/route', {  // Using route.ts directly
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submissionId: id,
            action: status,
            feedback
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'API request failed');
        }

        toast.success('Notification email sent');
      } catch (emailError: any) {
        console.error('Email error:', emailError);
        toast.error(`Email sending failed: ${emailError.message}`);
      }
    } catch (error: any) {
      console.error('Error updating submission:', error);
      toast.error(error.message || 'Failed to update submission');
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
                <img
                  src={submission.profile_picture_url}
                  alt={submission.full_name}
                  className="rounded-lg object-cover h-full w-full"
                  onError={(e) => {
                    console.error("Image failed to load:", submission.profile_picture_url);
                    e.currentTarget.src = "/globe.svg"; // Fallback image
                  }}
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