export interface User {
  id: number
  username: string
}

export interface Test {
  id: number
  title: string
  description?: string
  user_id: number
  created_at: string
  category?: string
  is_template?: boolean
  template_id?: number
}

export interface TestWithQuestions extends Test {
  questions: Question[]
}

export interface Question {
  id: number
  text: string
  test_id: number
  topic?: string
  options: Option[]
}

export interface Option {
  id: number
  text: string
  is_correct: boolean
  question_id: number
}

export interface TestResult {
  id: number
  test_id: number
  user_id?: number
  user_name: string
  score: number
  max_score: number
  created_at: string
  total_time?: number
  question_times?: Record<string, number>
  answers?: Record<string, any>
  test_title?: string
  is_variation?: boolean
  original_test_id?: number
}

export interface TestResultWithQuestions extends TestResult {
  questions_with_answers?: Array<{
    id: number
    text: string
    options: Option[]
    student_answer?: any
  }>
}

export interface TestResultCreate {
  test_id: number
  user_name: string
  score: number
  max_score: number
  total_time?: number
  question_times?: Record<string, number>
  answers?: Record<string, any>
}