export const API_CONFIG = {
  API_URL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  TIMEOUT: 30000,
}

export const API_ENDPOINTS = {
  LOGIN: "/login",
  REGISTER: "/register",
  PROTECTED: "/protected",

  TESTS: "/tests",
  GET_TEST: (id: number) => `/tests/${id}`,
  CREATE_TEST: "/tests",
  UPDATE_TEST: (id: number) => `/tests/${id}`,
  DELETE_TEST: (id: number) => `/tests/${id}`,
  GENERATE_VARIATION: (id: number) => `/tests/${id}/generate-variation`,

  QUESTIONS: "/questions",
  CREATE_QUESTION: "/questions",
  UPDATE_QUESTION: (id: number) => `/questions/${id}`,
  DELETE_QUESTION: (id: number) => `/questions/${id}`,

  RESULTS: "/test-results",
  GET_RESULTS: (testId: number) => `/test-results/test/${testId}`,
  CREATE_RESULT: "/test-results",
}
