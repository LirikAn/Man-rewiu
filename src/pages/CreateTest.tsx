"use client"

import { motion } from "framer-motion"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useEffect, useState } from "react"
import { createTest, getTest, createQuestion } from "../utils/api"

interface QuestionForm {
  text: string
  options: { text: string; is_correct: boolean }[]
}

const CreateTest = () => {
  const { isLoggedIn } = useAuth()
  const navigate = useNavigate()

  const [searchParams] = useSearchParams()
  const editId = searchParams.get("edit")
  const [isEditing, setIsEditing] = useState(false)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [questions, setQuestions] = useState<QuestionForm[]>([
    {
      text: "",
      options: [
        { text: "", is_correct: true },
        { text: "", is_correct: false },
      ],
    },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (editId) {
      setIsEditing(true)
      const fetchTest = async () => {
        const testData = await getTest(Number.parseInt(editId))
        if (testData) {
          setTitle(testData.title)
          setDescription(testData.description || "")

          const formattedQuestions = testData.questions.map((q) => ({
            text: q.text,
            options: q.options.map((o) => ({
              text: o.text,
              is_correct: o.is_correct,
            })),
          }))

          if (formattedQuestions.length > 0) {
            setQuestions(formattedQuestions)
          }
        }
      }

      fetchTest()
    }
  }, [editId])

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        text: "",
        options: [
          { text: "", is_correct: true },
          { text: "", is_correct: false },
        ],
      },
    ])
  }

  const handleRemoveQuestion = (index: number) => {
    const newQuestions = [...questions]
    newQuestions.splice(index, 1)
    setQuestions(newQuestions)
  }

  const handleQuestionChange = (index: number, value: string) => {
    const newQuestions = [...questions]
    newQuestions[index].text = value
    setQuestions(newQuestions)
  }

  const handleOptionChange = (questionIndex: number, optionIndex: number, value: string) => {
    const newQuestions = [...questions]
    newQuestions[questionIndex].options[optionIndex].text = value
    setQuestions(newQuestions)
  }

  const handleCorrectAnswerChange = (questionIndex: number, optionIndex: number) => {
    const newQuestions = [...questions]
    newQuestions[questionIndex].options.forEach((option, idx) => {
      option.is_correct = idx === optionIndex
    })
    setQuestions(newQuestions)
  }

  const handleAddOption = (questionIndex: number) => {
    const newQuestions = [...questions]
    newQuestions[questionIndex].options.push({ text: "", is_correct: false })
    setQuestions(newQuestions)
  }

  const handleSaveTest = async () => {
    if (!title.trim()) {
      setError("Будь ласка, введіть назву тесту")
      return
    }

    if (questions.some((q) => !q.text.trim())) {
      setError("Будь ласка, заповніть всі питання")
      return
    }

    if (questions.some((q) => q.options.some((o) => !o.text.trim()))) {
      setError("Будь ласка, заповніть всі варіанти відповідей")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const testData = {
        title,
        description: description || undefined,
      }

      let testId: number

      if (isEditing && editId) {
        testId = Number.parseInt(editId)
      } else {
        // Create new test
        const newTest = await createTest(testData)
        if (!newTest) {
          throw new Error("Failed to create test")
        }
        testId = newTest.id
      }

      for (const question of questions) {
        const questionData = {
          text: question.text,
          test_id: testId,
          options: question.options,
        }

        await createQuestion(questionData)
      }

      navigate("/my-tests")
    } catch (err) {
      console.error("Error saving test:", err)
      setError("Помилка при збереженні тесту")
    } finally {
      setLoading(false)
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-gray-900/90 backdrop-blur-sm p-8 rounded-xl border border-gray-800 max-w-md w-full text-center"
        >
          <h2 className="text-2xl font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
            Потрібно увійти в акаунт
          </h2>
          <p className="text-gray-300 mb-6">Для створення тестів необхідно увійти в акаунт</p>
          <motion.button
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-base font-medium w-full"
            whileHover={{ scale: 1.05, boxShadow: "0 0 10px rgba(59,130,246,0.5)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/login")}
          >
            Війти
          </motion.button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="py-8 max-w-3xl mx-auto">
      <motion.h1
        className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {isEditing ? "Редагувати тестування" : "Створити тестування"}
      </motion.h1>

      {error && (
        <div className="mb-6 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      <motion.div
        className="bg-gray-800/60 backdrop-blur-sm p-6 rounded-xl border border-gray-700 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Назва тесту</label>
          <input
            type="text"
            className="w-full bg-gray-700/80 border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none"
            placeholder="Введіть назву тесту"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Опис</label>
          <textarea
            className="w-full bg-gray-700/80 border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none min-h-[100px]"
            placeholder="Введіть опис тесту"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          ></textarea>
        </div>
      </motion.div>

      <motion.div
        className="bg-gray-800/60 backdrop-blur-sm p-6 rounded-xl border border-gray-700 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <h2 className="text-xl font-semibold text-white mb-4">Питання</h2>

        {questions.map((question, questionIndex) => (
          <div key={questionIndex} className="bg-gray-700/50 p-4 rounded-lg border border-gray-600 mb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium">Питання {questionIndex + 1}</h3>
              <button className="text-red-400 text-sm" onClick={() => handleRemoveQuestion(questionIndex)}>
                Видалити
              </button>
            </div>

            <div className="mb-3">
              <input
                type="text"
                className="w-full bg-gray-700/80 border border-gray-600 rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none"
                placeholder="Текст питання"
                value={question.text}
                onChange={(e) => handleQuestionChange(questionIndex, e.target.value)}
              />
            </div>

            <div className="space-y-2">
              {question.options.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct_answer_${questionIndex}`}
                    id={`answer_${questionIndex}_${optionIndex}`}
                    className="w-4 h-4 text-blue-500"
                    checked={option.is_correct}
                    onChange={() => handleCorrectAnswerChange(questionIndex, optionIndex)}
                  />
                  <input
                    type="text"
                    className="flex-1 bg-gray-700/80 border border-gray-600 rounded-lg p-2 text-white focus:border-blue-500 focus:outline-none"
                    placeholder={`Варіант відповіді ${optionIndex + 1}`}
                    value={option.text}
                    onChange={(e) => handleOptionChange(questionIndex, optionIndex, e.target.value)}
                  />
                </div>
              ))}

              <button className="text-blue-400 text-sm" onClick={() => handleAddOption(questionIndex)}>
                + Додати варіант відповіді
              </button>
            </div>
          </div>
        ))}

        <motion.button
          className="w-full p-3 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-medium"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAddQuestion}
        >
          + Додати питання
        </motion.button>
      </motion.div>

      <div className="flex justify-end gap-4">
        <motion.button
          className="px-6 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm font-medium"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/my-tests")}
        >
          Скасувати
        </motion.button>

        <motion.button
          className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-sm font-medium"
          whileHover={{ scale: 1.05, boxShadow: "0 0 10px rgba(59,130,246,0.5)" }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSaveTest}
          disabled={loading}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              <span>Зачекайте...</span>
            </div>
          ) : isEditing ? (
            "Оновити тест"
          ) : (
            "Зберегти тест"
          )}
        </motion.button>
      </div>
    </div>
  )
}

export default CreateTest

