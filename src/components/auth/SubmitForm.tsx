"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Compressor from 'compressorjs'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import toast from 'react-hot-toast'

interface SubmitFormProps {
  userId: string
  userEmail: string
}

export default function SubmitForm({ userId, userEmail }: SubmitFormProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    location: '',
    hobbies: '',
  })
  const [profilePicture, setProfilePicture] = useState<File | null>(null)
  const [sourceCode, setSourceCode] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const compressImage = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      maxWidth: 1080,
      maxHeight: 1080,
      quality: 0.8,
      success(result) {
        if (result.size <= 1024 * 1024) {
          resolve(result)
        } else {
          reject(new Error('Compressed image is still too large'))
        }
      },
      error: reject,
    })
  })
}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!profilePicture || !sourceCode) {
        throw new Error('Please upload both profile picture and source code')
      }

      // Compress profile picture
      const compressedImage = await compressImage(profilePicture)
      
      // Upload profile picture
      const profilePicturePath = `${userId}/${Date.now()}-${profilePicture.name}`
      const { error: uploadProfileError } = await supabase.storage
        .from('profile-pictures')
        .upload(profilePicturePath, compressedImage)

      if (uploadProfileError) throw uploadProfileError

      // Upload source code
      const sourceCodePath = `${userId}/${Date.now()}-${sourceCode.name}`
      const { error: uploadSourceError } = await supabase.storage
        .from('source-code')
        .upload(sourceCodePath, sourceCode)

      if (uploadSourceError) throw uploadSourceError

      // Get URLs
      const { data: { publicUrl: profilePictureUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(profilePicturePath)

      const { data: { publicUrl: sourceCodeUrl } } = supabase.storage
        .from('source-code')
        .getPublicUrl(sourceCodePath)

      // Create submission
      const { error: submissionError } = await supabase
        .from('submissions')
        .insert({
          user_id: userId,
          full_name: formData.fullName,
          phone_number: formData.phoneNumber,
          location: formData.location,
          email: userEmail,
          hobbies: formData.hobbies,
          profile_picture_url: profilePictureUrl,
          source_code_url: sourceCodeUrl,
          status: 'pending'
        })

      if (submissionError) throw submissionError

      toast.success('Application submitted successfully!')
      router.refresh()

    } catch (error: any) {
      toast.error(error.message || 'Failed to submit application')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
          Full Name
        </label>
        <input
          id="fullName"
          type="text"
          required
          value={formData.fullName}
          onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
          Phone Number
        </label>
        <input
          id="phoneNumber"
          type="tel"
          required
          value={formData.phoneNumber}
          onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700">
          Location
        </label>
        <input
          id="location"
          type="text"
          required
          value={formData.location}
          onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="hobbies" className="block text-sm font-medium text-gray-700">
          What do you like to do in life (other than coding)?
        </label>
        <textarea
          id="hobbies"
          required
          value={formData.hobbies}
          onChange={(e) => setFormData(prev => ({ ...prev, hobbies: e.target.value }))}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          rows={4}
        />
      </div>

      <div>
        <label htmlFor="profilePicture" className="block text-sm font-medium text-gray-700">
          Profile Picture
        </label>
        <input
          id="profilePicture"
          type="file"
          accept="image/*"
          required
          onChange={(e) => setProfilePicture(e.target.files?.[0] || null)}
          className="mt-1 block w-full"
        />
        <p className="mt-1 text-sm text-gray-500">Maximum size: 1MB. Will be resized if larger.</p>
      </div>

      <div>
        <label htmlFor="sourceCode" className="block text-sm font-medium text-gray-700">
          Source Code (ZIP)
        </label>
        <input
          id="sourceCode"
          type="file"
          accept=".zip"
          required
          onChange={(e) => setSourceCode(e.target.files?.[0] || null)}
          className="mt-1 block w-full"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
          isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Application'}
      </button>
    </form>
  )
}