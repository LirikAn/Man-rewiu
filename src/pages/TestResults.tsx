"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { getTestResults, getTest } from "../utils/api"
import type { TestResultWithQuestions, TestWithQuestions } from "../types/index"

const TestResults = () => {
  const { testId } = useParams()
  const navigate = useNavigate()
  const [results, setResults] = useState<TestResultWithQuestions[]>([])
  const [test, setTest] = useState<TestWithQuestions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<"date" | "score" | "name" | "time">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [selectedResult, setSelectedResult] = useState<TestResultWithQuestions | null>(null)

  type QuestionWithAnswer = NonNullable<TestResultWithQuestions['questions_with_answers']>[number]

  useEffect(() => {
    const fetchData = async () => {
      if (!testId) return

      setLoading(true)
      try {
        const token = localStorage.getItem("token")
        if (!token) {
          setError("Вы не авторизованы. Пожалуйста, войдите в систему.")
          setLoading(false)
          setTimeout(() => {
            navigate("/login", { replace: true })
          }, 2000)
          return
        }
        
        let testData = null
        let resultsData = null
        
        try {
          testData = await getTest(Number(testId))
        } catch (testError) {
          console.error('Error fetching test data:', testError)
          setError("Ошибка при загрузке данных теста")
          setLoading(false)
          return
        }
        
        try {
          resultsData = await getTestResults(Number(testId))
          console.log("Получены результаты:", resultsData)
          console.log("Количество результатов:", resultsData ? resultsData.length : 0)
          if (resultsData && resultsData.length > 0) {
            console.log("Первый результат:", resultsData[0])
          }
        } catch (resultsError) {
          console.error('Error fetching results data:', resultsError)
          setError("Ошибка при загрузке результатов теста")
          setLoading(false)
          return
        }

        if (testData) {
          setTest(testData)
        } else {
          setError("Тест не знайдено")
        }

        if (resultsData) {
          console.log("Обработка результатов:", resultsData.length)
          const processedResults = resultsData.map(result => {
            if (result.questions_with_answers && Array.isArray(result.questions_with_answers)) {
              const answers: Record<string, any> = {}
              result.questions_with_answers.forEach((question: QuestionWithAnswer) => {
                if (question?.student_answer) {
                  answers[question.id.toString()] = {
                    option_id: question.student_answer.option_id,
                    is_correct: question.student_answer.is_correct
                  }
                }
              })
              return { ...result, answers }
            }
            return result
          })
          
          console.log("После обработки:", processedResults.length)
          setResults(processedResults)
        } else if (testData) {
          console.log("Результатов не получено, но тест найден")
          setResults([])
        } else {
          setError("Помилка при завантаженні результатів. Можливо, у вас немає прав для перегляду цього тесту.")
        }
      } catch (err) {
        console.error("Error fetching results:", err)
        if (err instanceof Error) {
          setError(`Помилка при завантаженні результатів: ${err.message}`)
        } else {
          setError("Помилка при завантаженні результатів. Перевірте консоль для деталей.")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [testId, navigate])

  const handleSort = (key: "date" | "score" | "name" | "time") => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(key)
      setSortOrder("desc")
    }
  }

  const sortedResults = [...results].sort((a, b) => {
    if (sortBy === "date") {
      return sortOrder === "asc"
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    } else if (sortBy === "score") {
      const scoreA = (a.score / a.max_score) * 100
      const scoreB = (b.score / b.max_score) * 100
      return sortOrder === "asc" ? scoreA - scoreB : scoreB - scoreA
    } else if (sortBy === "time") {
      const timeA = a.total_time || 0
      const timeB = b.total_time || 0
      return sortOrder === "asc" ? timeA - timeB : timeB - timeA
    } else {
      return sortOrder === "asc" ? a.user_name.localeCompare(b.user_name) : b.user_name.localeCompare(a.user_name)
    }
  })

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return "text-green-400"
    if (percentage >= 60) return "text-yellow-400"
    return "text-red-400"
  }

  // Convert score to 12-point scale
  const getGrade12 = (score: number, maxScore: number): number => {
    if (maxScore === 0) return 0
    const percentage = (score / maxScore) * 100

    if (percentage >= 95) return 12
    if (percentage >= 90) return 11
    if (percentage >= 85) return 10
    if (percentage >= 80) return 9
    if (percentage >= 70) return 8
    if (percentage >= 65) return 7
    if (percentage >= 60) return 6
    if (percentage >= 50) return 5
    if (percentage >= 40) return 4
    if (percentage >= 30) return 3
    if (percentage >= 20) return 2
    if (percentage > 0) return 1
    return 0
  }

  const formatTime = (seconds = 0): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const handleViewDetails = (result: TestResultWithQuestions) => {
    setSelectedResult(result)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 max-w-3xl mx-auto">
        <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-center">{error}</div>
        <div className="mt-4 text-center">
          <motion.button
            className="px-6 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm font-medium"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/my-tests")}
          >
            Повернутися до моїх тестів
          </motion.button>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <motion.h1
          className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          Результати тесту
        </motion.h1>

        <motion.button
          className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm font-medium"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          onClick={() => navigate("/my-tests")}
        >
          Назад
        </motion.button>
      </div>

      {test && (
        <motion.div
          className="bg-gray-800/60 backdrop-blur-sm p-6 rounded-xl border border-gray-700 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-xl font-semibold text-white mb-2">{test.title}</h2>
          {test.description && <p className="text-gray-300 text-sm">{test.description}</p>}
          <div className="flex items-center justify-between mt-2">
            <div className="text-sm text-gray-400">Кількість питань: {test.questions.length}</div>
            
            {test.category && (
              <div className={`px-2 py-1 rounded-md text-xs font-medium
                ${test.category === "Математика" ? "bg-blue-500/20 text-blue-400" : 
                  test.category === "Історія" ? "bg-amber-500/20 text-amber-400" :
                  test.category === "Біологія" ? "bg-green-500/20 text-green-400" :
                  test.category === "Фізика" ? "bg-purple-500/20 text-purple-400" :
                  test.category === "Хімія" ? "bg-pink-500/20 text-pink-400" :
                  test.category === "Інформатика" ? "bg-indigo-500/20 text-indigo-400" :
                  "bg-gray-500/20 text-gray-400"
                }`}
              >
                {test.category}
              </div>
            )}
          </div>
        </motion.div>
      )}

      <motion.div
        className="bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-2">Результати учнів</h3>
          <p className="text-gray-300 text-sm">
            {results.length > 0 ? `Всього пройшли тест: ${results.length} учнів` : "Поки що ніхто не пройшов цей тест"}
          </p>
        </div>

        {results.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("name")}
                  >
                    Ім'я учня
                    {sortBy === "name" && <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("score")}
                  >
                    Результат
                    {sortBy === "score" && <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("time")}
                  >
                    Час
                    {sortBy === "time" && <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("date")}
                  >
                    Дата
                    {sortBy === "date" && <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Дії
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((result) => (
                  <tr key={result.id} className="border-b border-gray-700 hover:bg-gray-700/30">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{result.user_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className={getScoreColor(result.score, result.max_score)}>
                        {result.score} / {result.max_score} ({Math.round((result.score / result.max_score) * 100)}%)
                      </div>
                      <div className="text-yellow-400 text-xs mt-1">
                        Оцінка: {getGrade12(result.score, result.max_score)}/12
                      </div>
                      {result.is_variation && result.test_title && (
                        <div className="text-xs text-indigo-400 mt-1">
                          Тест: {result.test_title}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-400">
                      {result.total_time ? formatTime(result.total_time) : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {new Date(result.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleViewDetails(result)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Деталі
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-400">Поки що немає результатів для цього тесту</div>
        )}
      </motion.div>

      {results.length > 0 && (
        <motion.div
          className="bg-gray-800/60 backdrop-blur-sm p-6 rounded-xl border border-gray-700 mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h3 className="text-lg font-semibold text-white mb-4">Статистика</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
              <div className="text-sm text-gray-400">Середній бал</div>
              <div className="text-2xl font-bold text-white">
                {Math.round(
                  (results.reduce((sum, result) => sum + (result.score / result.max_score) * 100, 0) / results.length) *
                    10,
                ) / 10}
                %
              </div>
            </div>
            <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
              <div className="text-sm text-gray-400">Найвищий бал</div>
              <div className="text-2xl font-bold text-green-400">
                {Math.round(Math.max(...results.map((result) => (result.score / result.max_score) * 100)) * 10) / 10}%
              </div>
            </div>
            <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
              <div className="text-sm text-gray-400">Найнижчий бал</div>
              <div className="text-2xl font-bold text-red-400">
                {Math.round(Math.min(...results.map((result) => (result.score / result.max_score) * 100)) * 10) / 10}%
              </div>
            </div>
            <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
              <div className="text-sm text-gray-400">Середній час</div>
              <div className="text-2xl font-bold text-blue-400">
                {formatTime(
                  Math.round(results.reduce((sum, result) => sum + (result.total_time || 0), 0) / results.length),
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {}
      {selectedResult && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900/90 backdrop-blur-sm p-6 rounded-xl border border-gray-800 max-w-2xl w-full"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">Детальні результати</h3>
              <button
                onClick={() => setSelectedResult(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-400">Учень</div>
              <div className="text-lg font-medium text-white">{selectedResult.user_name}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-800/80 p-4 rounded-lg border border-gray-700">
                <div className="text-sm text-gray-400">Результат</div>
                <div className={`text-xl font-bold ${getScoreColor(selectedResult.score, selectedResult.max_score)}`}>
                  {selectedResult.score} / {selectedResult.max_score}
                </div>
                <div className="text-yellow-400 text-sm mt-1">
                  Оцінка: {getGrade12(selectedResult.score, selectedResult.max_score)}/12
                </div>
              </div>

              <div className="bg-gray-800/80 p-4 rounded-lg border border-gray-700">
                <div className="text-sm text-gray-400">Загальний час</div>
                <div className="text-xl font-bold text-blue-400">
                  {selectedResult.total_time ? formatTime(selectedResult.total_time) : "—"}
                </div>
              </div>

              <div className="bg-gray-800/80 p-4 rounded-lg border border-gray-700">
                <div className="text-sm text-gray-400">Дата проходження</div>
                <div className="text-xl font-bold text-white">
                  {new Date(selectedResult.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            {test && selectedResult.question_times && Object.keys(selectedResult.question_times).length > 0 && (
              <div>
                <h4 className="text-lg font-medium text-white mb-3">Час на кожне питання</h4>
                <div className="bg-gray-800/80 rounded-lg border border-gray-700 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Питання</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Час</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedResult.questions_with_answers ? (
                        selectedResult.questions_with_answers.map((question: QuestionWithAnswer) => (
                          <tr key={question.id} className="border-b border-gray-700">
                            <td className="px-4 py-3 text-sm text-white">
                              {question.text.length > 50 ? question.text.substring(0, 50) + "..." : question.text}
                            </td>
                            <td className="px-4 py-3 text-sm text-blue-400">
                              {selectedResult.question_times && selectedResult.question_times[question.id.toString()]
                                ? formatTime(selectedResult.question_times[question.id.toString()])
                                : "—"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        test.questions.map((question: TestWithQuestions['questions'][number]) => (
                          <tr key={question.id} className="border-b border-gray-700">
                            <td className="px-4 py-3 text-sm text-white">
                              {question.text.length > 50 ? question.text.substring(0, 50) + "..." : question.text}
                            </td>
                            <td className="px-4 py-3 text-sm text-blue-400">
                              {selectedResult.question_times && selectedResult.question_times[question.id.toString()]
                                ? formatTime(selectedResult.question_times[question.id.toString()])
                                : "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {test && selectedResult.answers && (
              <div className="mt-6">
                <h4 className="text-lg font-medium text-white mb-3">Відповіді учня</h4>
                <div className="bg-gray-800/80 rounded-lg border border-gray-700 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Питання</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Відповідь учня</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Правильність</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedResult.questions_with_answers ? (
                        selectedResult.questions_with_answers.map((question: QuestionWithAnswer) => {
                          const studentAnswer = question.student_answer;
                          const selectedOption = question.options.find((opt: any) => opt.id === (studentAnswer?.option_id || null));
                          const isCorrect = studentAnswer?.is_correct;
                          
                          return (
                            <tr key={question.id} className="border-b border-gray-700">
                              <td className="px-4 py-3 text-sm text-white">
                                {question.text.length > 50 ? question.text.substring(0, 50) + "..." : question.text}
                              </td>
                              <td className="px-4 py-3 text-sm text-white">
                                {selectedOption ? selectedOption.text : "Не відповідав"}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {isCorrect !== undefined ? (
                                  <span className={isCorrect ? "text-green-400" : "text-red-400"}>
                                    {isCorrect ? "Вірно" : "Невірно"}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        test.questions.map((question: TestWithQuestions['questions'][number]) => {
                          const answer = selectedResult.answers ? selectedResult.answers[question.id.toString()] : undefined;
                          const options = question.options || [];
                          const selectedOption = options.find((opt) => opt.id === (answer?.option_id || null));
                          const isCorrect = answer?.is_correct;
                          
                          return (
                            <tr key={question.id} className="border-b border-gray-700">
                              <td className="px-4 py-3 text-sm text-white">
                                {question.text.length > 50 ? question.text.substring(0, 50) + "..." : question.text}
                              </td>
                              <td className="px-4 py-3 text-sm text-white">
                                {selectedOption ? selectedOption.text : "Не відповідав"}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {isCorrect !== undefined ? (
                                  <span className={isCorrect ? "text-green-400" : "text-red-400"}>
                                    {isCorrect ? "Вірно" : "Невірно"}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedResult(null)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
              >
                Закрити
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default TestResults

