export interface TestResult {
  id: number
  test_id: number
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