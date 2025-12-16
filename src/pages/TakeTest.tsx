"use client"

import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { getTest, submitTestResult, deleteTest } from "../utils/api"
import type { Question, TestWithQuestions } from "../types/index"
import AIBadge from "../components/AIBadge"

const TakeTest = () => {
  const { testId: urlTestId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [generateNew, setGenerateNew] = useState(false)

  const [step, setStep] = useState<"enter" | "test" | "result">("enter")
  const [name, setName] = useState("")
  const [testCode, setTestCode] = useState(urlTestId || "")
  const [originalTestId, setOriginalTestId] = useState<number | null>(null)
  const [test, setTest] = useState<TestWithQuestions | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [score, setScore] = useState(0)
  const [isGeneratedTest, setIsGeneratedTest] = useState(false)

  const [startTime, setStartTime] = useState<number | null>(null)
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null)
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({})
  const [totalTime, setTotalTime] = useState<number>(0)
  
  useEffect(() => {
    if (generateNew && testCode && name && step === "enter" && !loading) {
      handleStartTest()
    }
  }, [generateNew, testCode, name, step, loading])

  useEffect(() => {
    setGenerateNew(searchParams.get("generate") === "true")
  }, [searchParams])

  useEffect(() => {
    if (urlTestId) {
      setTestCode(urlTestId)
    }
  }, [urlTestId])

  useEffect(() => {
    if (step === "test") {
      setQuestionStartTime(Date.now())
    }
  }, [currentQuestion, step])

  const handleStartTest = async () => {
    if (!name.trim()) {
      setError("Будь ласка, введіть ваше ім'я")
      return
    }

    if (!testCode.trim()) {
      setError("Будь ласка, введіть код тесту")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const origId = Number.parseInt(testCode)
      setOriginalTestId(origId)
      
      const testData = await getTest(origId, true)

      if (testData) {
        console.log("Загруженные данные теста:", {
          id: testData.id,
          title: testData.title,
          template_id: (testData as any).template_id,
          questions: testData.questions.length,
          originalId: origId
        })
        setTest(testData)
        setIsGeneratedTest(true)
        setSelectedAnswers(new Array(testData.questions.length).fill(null))
        setCurrentQuestion(0)
        setStep("test")
        setStartTime(Date.now())
        setQuestionStartTime(Date.now())
      } else {
        setError("Тест не знайдено. Перевірте код тесту.")
      }
    } catch (err) {
      console.error("Error fetching test:", err)
      setError("Помилка при завантаженні тесту")
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAnswer = (answerIndex: number) => {
    const newSelectedAnswers = [...selectedAnswers]
    newSelectedAnswers[currentQuestion] = answerIndex
    setSelectedAnswers(newSelectedAnswers)
  }

  const recordQuestionTime = () => {
    if (
      questionStartTime &&
      test &&
      Array.isArray(test.questions) &&
      test.questions[currentQuestion]
    ) {
      const questionId = test.questions[currentQuestion].id.toString()
      const timeSpent = Math.round((Date.now() - questionStartTime) / 1000)
      setQuestionTimes((prev) => ({
        ...prev,
        [questionId]: (prev[questionId] || 0) + timeSpent,
      }))
    }
  }

  const handleNextQuestion = async () => {
    recordQuestionTime()

    if (currentQuestion < (test?.questions.length || 0) - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {

      const endTime = Date.now()
      const totalTimeSpent = startTime ? Math.round((endTime - startTime) / 1000) : 0
      setTotalTime(totalTimeSpent)

      let totalScore = 0
      test?.questions.forEach((question: Question, index: number) => {
        const selectedAnswerIndex = selectedAnswers[index]
        if (selectedAnswerIndex !== null) {
          const selectedOption = question.options[selectedAnswerIndex]
          if (selectedOption && selectedOption.is_correct) {
            totalScore++
          }
        }
      })

      setScore(totalScore)

      const answersMap: Record<string, any> = {}
      test?.questions.forEach((question: Question, index: number) => {
        const selectedAnswerIndex = selectedAnswers[index]
        if (selectedAnswerIndex !== null) {
          answersMap[question.id.toString()] = {
            option_id: question.options[selectedAnswerIndex].id,
            selected_index: selectedAnswerIndex,
            is_correct: question.options[selectedAnswerIndex].is_correct
          }
        }
      })

      if (test) {
        const templateId = (test as any).template_id
        const testIdToSave = originalTestId || test.id
        
        console.log("Информация о тесте перед отправкой:", {
          test_id: test.id,
          template_id: templateId,
          originalTestId: originalTestId,
          testIdToSave: testIdToSave,
          is_generated: templateId ? true : false
        })
        
        console.log("Отправка результата:", {
          test_id: testIdToSave,
          user_name: name,
          score: totalScore,
          max_score: test.questions.length,
          total_time: totalTimeSpent,
          question_times: questionTimes,
          answers: answersMap
        })
        
        const resultResponse = await submitTestResult({
          test_id: testIdToSave,
          user_name: name,
          score: totalScore,
          max_score: test.questions.length,
          total_time: totalTimeSpent,
          question_times: questionTimes,
          answers: answersMap
        })
        
        console.log("Ответ от сервера:", resultResponse)
        
        if (templateId) {
          console.log("Удаляем вариант теста:", test.id)
          await deleteTest(test.id)
        }
      }

      setStep("result")
    }
  }

  const handlePreviousQuestion = () => {
    recordQuestionTime()

    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  useEffect(() => {
    if (test && Array.isArray(test.questions)) {
      if (currentQuestion < 0) {
        setCurrentQuestion(0)
      } else if (currentQuestion >= test.questions.length) {
        setCurrentQuestion(test.questions.length - 1)
      }
    }
  }, [test, currentQuestion])

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

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
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

  return (
    <div className="py-8 max-w-3xl mx-auto">
      {step === "enter" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-gray-900/90 backdrop-blur-sm p-8 rounded-xl border border-gray-800 max-w-md mx-auto"
        >
          <h2 className="text-2xl font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-6 text-center">
            Пройти тест
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Ваше ім'я</label>
              <input
                type="text"
                className="w-full bg-gray-800/80 border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none"
                placeholder="Введіть ваше ім'я"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Код тесту</label>
              <input
                type="text"
                className="w-full bg-gray-800/80 border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none"
                placeholder="Введіть код тесту"
                value={testCode}
                onChange={(e) => setTestCode(e.target.value)}
              />
            </div>
          </div>
          <motion.button
            className="w-full p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-base font-medium"
            whileHover={{ scale: 1.02, boxShadow: "0 0 10px rgba(59,130,246,0.5)" }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStartTest}
          >
            Почати тест
          </motion.button>
        </motion.div>
      )}

      {step === "test" && test && (
        <div>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex justify-between items-center mb-6"
          >
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-white">{test.title}</h2>
              {isGeneratedTest && <AIBadge className="mt-2" />}
            </div>
            <div className="text-sm text-gray-300">
              Питання {currentQuestion + 1} з {test.questions.length}
            </div>
          </motion.div>

          {(!test.questions || !test.questions.length || !test.questions[currentQuestion]) ? (
            <div className="bg-gray-800/60 backdrop-blur-sm p-6 rounded-xl border border-gray-700 mb-6 text-gray-300">
              У цього тесту немає доступних питань.
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-gray-800/60 backdrop-blur-sm p-6 rounded-xl border border-gray-700 mb-6"
            >
              <h3 className="text-lg font-medium text-white mb-4">{test.questions[currentQuestion].text}</h3>

              {test.questions[currentQuestion].topic && (
                <div className="mb-4 inline-block px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded-md text-xs text-blue-400">
                  Тема: {test.questions[currentQuestion].topic}
                </div>
              )}

              <div className="space-y-3">
                {test.questions[currentQuestion].options.map((option: any, index: number) => (
                  <motion.div
                    key={index}
                    className={`p-3 rounded-lg border cursor-pointer ${
                      selectedAnswers[currentQuestion] === index
                        ? "bg-blue-500/20 border-blue-500"
                        : "bg-gray-700/50 border-gray-600 hover:border-gray-500"
                    }`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleSelectAnswer(index)}
                  >
                    {option.text}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          <div className="flex justify-between">
            <motion.button
              className="px-6 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePreviousQuestion}
              disabled={currentQuestion === 0}
            >
              Назад
            </motion.button>

            <motion.button
              className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-sm font-medium"
              whileHover={{ scale: 1.05, boxShadow: "0 0 10px rgba(59,130,246,0.5)" }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNextQuestion}
              disabled={
                !test.questions ||
                !test.questions.length ||
                !test.questions[currentQuestion] ||
                selectedAnswers[currentQuestion] === null
              }
            >
              {currentQuestion < test.questions.length - 1 ? "Наступне питання" : "Завершити тест"}
            </motion.button>
          </div>
        </div>
      )}

      {step === "result" && test && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-gray-900/90 backdrop-blur-sm p-8 rounded-xl border border-gray-800 max-w-md mx-auto text-center"
        >
          <h2 className="text-2xl font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
            Результати тесту
          </h2>

          <div className="text-6xl font-bold text-white mb-4">
            {score} / {test.questions.length}
          </div>

          <div className="text-2xl font-bold text-yellow-400 mb-6">
            Оцінка: {getGrade12(score, test.questions.length)} / 12
          </div>

          <div className="mb-6 p-4 bg-gray-800/80 rounded-lg">
            <div className="text-sm text-gray-300 mb-2">Загальний час: {formatTime(totalTime)}</div>
            <div className="text-sm text-gray-300">
              Середній час на питання: {formatTime(Math.round(totalTime / test.questions.length))}
            </div>
          </div>

          <p className="text-gray-300 mb-6">
            {score === test.questions.length
              ? "Відмінно! Ви відповіли правильно на всі питання."
              : score >= test.questions.length / 2
                ? "Добре! Ви відповіли правильно на більшість питань."
                : "Спробуйте ще раз, щоб покращити свій результат."}
          </p>

          <div className="flex flex-col gap-3">
            <motion.button
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-base font-medium"
              whileHover={{ scale: 1.05, boxShadow: "0 0 10px rgba(59,130,246,0.5)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setStep("enter")}
            >
              Пройти інший тест
            </motion.button>

            {test.category === "Математика" && (
              <motion.button
                className="px-6 py-3 bg-gray-800 border border-gray-700 rounded-xl text-base font-medium"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setStep("enter")
                  const newParams = new URLSearchParams(searchParams)
                  newParams.set("generate", "true")
                  navigate({ search: newParams.toString() })
                }}
              >
                Спробувати новий варіант цього тесту
              </motion.button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default TakeTest

