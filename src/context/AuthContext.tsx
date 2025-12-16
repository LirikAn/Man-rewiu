"use client"

import { createContext, useState, useContext, type ReactNode, useEffect } from "react"
import { API_CONFIG, API_ENDPOINTS } from "../config/api"

interface AuthContextType {
  isLoggedIn: boolean
  login: (username: string, password: string) => Promise<boolean>
  register: (username: string, password: string) => Promise<boolean>
  logout: () => void
  user: { name: string } | null
  loading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<{ name: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("token")
    const username = localStorage.getItem("username")

    if (token && username) {
      setIsLoggedIn(true)
      setUser({ name: username })
    }
  }, [])

  const login = async (username: string, password: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const formData = new URLSearchParams()
      formData.append("username", username)
      formData.append("password", password)

      const response = await fetch(`${API_CONFIG.API_URL}${API_ENDPOINTS.LOGIN}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem("token", data.access_token)
        localStorage.setItem("username", username)
        setIsLoggedIn(true)
        setUser({ name: username })
        setLoading(false)
        return true
      } else {
        setError(data.detail || "Помилка входу")
        setLoading(false)
        return false
      }
    } catch (err) {
      console.error("Помилка входу:", err)
      setError("Помилка з'єднання з сервером")
      setLoading(false)
      return false
    }
  }

  const register = async (username: string, password: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_CONFIG.API_URL}${API_ENDPOINTS.REGISTER}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (response.ok) {
        setLoading(false)
        return true
      } else {
        setError(data.detail || "Помилка реєстрації")
        setLoading(false)
        return false
      }
    } catch (err) {
      console.error("Registration error:", err)
      setError("Помилка з'єднання з сервером")
      setLoading(false)
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("username")
    setIsLoggedIn(false)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, register, logout, user, loading, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

