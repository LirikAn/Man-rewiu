import type { Test, TestWithQuestions, TestResultWithQuestions, TestResult, TestResultCreate } from "../types/index"
import { API_CONFIG, API_ENDPOINTS } from "../config/api"

const API_URL = API_CONFIG.API_URL

export const getToken = (): string | null => {
  return localStorage.getItem("token")
}

export const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  const token = getToken()

  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
    "Content-Type": "application/json",
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("token")
      localStorage.removeItem("username")
      window.location.href = "/login"
    }

    return response
  } catch (error) {
    console.error(`Ошибка при запросе: ${endpoint}`, error)
    throw error
  }
}

export const checkAuth = async (): Promise<boolean> => {
  try {
    const response = await fetchWithAuth(API_ENDPOINTS.PROTECTED)
    return response.ok
  } catch {
    return false
  }
}

export const getUserData = async () => {
  try {
    const response = await fetchWithAuth(API_ENDPOINTS.PROTECTED)
    if (response.ok) {
      return await response.json()
    }
    return null
  } catch (error) {
    console.error("Ошибка получения данных пользователя:", error)
    return null
  }
}

export const getUserTests = async (): Promise<Test[]> => {
  try {
    const response = await fetchWithAuth(API_ENDPOINTS.TESTS)
    if (response.ok) {
      return await response.json()
    }
    return []
  } catch (error) {
    console.error("Ошибка получения тестов:", error)
    return []
  }
}

export const createTest = async (testData: any): Promise<Test | null> => {
  try {
    const response = await fetchWithAuth(API_ENDPOINTS.CREATE_TEST, {
      method: "POST",
      body: JSON.stringify(testData),
    })
    if (response.ok) {
      return await response.json()
    }
    return null
  } catch (error) {
    console.error("Ошибка создания теста:", error)
    return null
  }
}

export const getTest = async (testId: number, generateNew = false): Promise<TestWithQuestions | null> => {
  try {
    let finalTestId = testId
    
    if (generateNew) {
      const generatedTest = await generateTestVariation(testId)
      if (generatedTest) {
        finalTestId = generatedTest.id
      }
    }
    
    const response = await fetchWithAuth(API_ENDPOINTS.GET_TEST(finalTestId))
    if (response.ok) {
      return await response.json()
    }
    return null
  } catch (error) {
    console.error("Error", error)
    return null
  }
}

export const generateTestVariation = async (testId: number): Promise<Test | null> => {
  try {
    const response = await fetchWithAuth(API_ENDPOINTS.GENERATE_VARIATION(testId), {
      method: "POST",
    })
    if (response.ok) {
      return await response.json()
    }
    return null
  } catch (error) {
    console.error("Error", error)
    return null
  }
}

export const submitTestResult = async (resultData: TestResultCreate): Promise<TestResult | null> => {
  try {
    const response = await fetchWithAuth(API_ENDPOINTS.CREATE_RESULT, {
      method: "POST",
      body: JSON.stringify(resultData),
    })
    if (response.ok) {
      return await response.json()
    }
    return null
  } catch (error) {
    console.error("Ошибка отправки результата:", error)
    return null
  }
}

export const getTestResults = async (testId: number): Promise<TestResultWithQuestions[] | null> => {
  if (!testId || isNaN(Number(testId))) {
    console.error("Невалидный ID теста:", testId)
    return null
  }

  try {
    const response = await fetchWithAuth(API_ENDPOINTS.GET_RESULTS(testId))
    if (response.ok) {
      return await response.json()
    }
    return null
  } catch (error) {
    console.error("Ошибка при получении результатов теста:", error)
    return null
  }
}

export const createQuestion = async (questionData: any): Promise<any | null> => {
  try {
    const response = await fetchWithAuth(API_ENDPOINTS.CREATE_QUESTION, {
      method: "POST",
      body: JSON.stringify(questionData),
    })
    if (response.ok) {
      return await response.json()
    }
    return null
  } catch (error) {
    console.error("Ошибка создания вопроса:", error)
    return null
  }
}

export const deleteTest = async (testId: number): Promise<boolean> => {
  try {
    const response = await fetchWithAuth(API_ENDPOINTS.DELETE_TEST(testId), {
      method: "DELETE",
    })
    return response.ok
  } catch (error) {
    console.error("Ошибка удаления теста:", error)
    return false
  }
}

