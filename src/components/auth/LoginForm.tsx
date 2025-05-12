"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'
export default function LoginForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (error) {
                throw error
            }

            // Fetch user role
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('role')
                .eq('id', data.user?.id)
                .single()

            if (userError) {
                throw userError
            }

            // Route based on role
            if (userData.role === 'developer') {
                router.push('/submit')
            } else if (userData.role === 'evaluator') {
                router.push('/evaluate')
            } else {
                throw new Error('Invalid user role')
            }

            toast.success('Login successful!')
        } catch (error: any) {
            toast.error(error.message || 'Login failed')
        } finally {
            setIsLoading(false)
        }
    }
    return (
        <form onSubmit={handleLogin} className="space-y-4">
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                </label>
                <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus focus focus focus"
                />
            </div>
            <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                </label>
                <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus focus focus focus"
                />
            </div>
            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
                {isLoading ? 'Logging in...' : 'Login'}
            </button>
        </form>
    )
}