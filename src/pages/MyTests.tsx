"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useEffect, useState } from "react"
import { getUserTests, deleteTest, generateTestVariation } from "../utils/api"
import type { Test } from "../types/index"

const MyTests = () => {
  const { isLoggedIn } = useAuth()
  const navigate = useNavigate()
  const [tests, setTests] = useState<Test[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null)
  const [testToDelete, setTestToDelete] = useState<Test | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [generatingVariation, setGeneratingVariation] = useState(false)

  useEffect(() => {
    if (isLoggedIn) {
      fetchTests()
    }
  }, [isLoggedIn])

  const fetchTests = async () => {
    setLoading(true)
    const testsData = await getUserTests()
    setTests(testsData)
    setLoading(false)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert("Код теста скопійовано в буфер обміну")
    } catch (err) {
      console.error("Помилка копіювання:", err)
    }
  }

  const handleDeleteTest = async () => {
    if (!testToDelete) return

    setDeleteLoading(true)
    const success = await deleteTest(testToDelete.id)
    setDeleteLoading(false)

    if (success) {
      setTests(tests.filter((test) => test.id !== testToDelete.id))
      setTestToDelete(null)
    } else {
      alert("Помилка при видаленні тесту")
    }
  }

  const handleGenerateVariation = async (testId: number) => {
    setGeneratingVariation(true)
    try {
      const newTest = await generateTestVariation(testId)
      if (newTest) {
        setTests([...tests, newTest])
        alert("Новий варіант тесту успішно створено!")
      } else {
        alert("Помилка при створенні варіанту тесту")
      }
    } catch (error) {
      console.error("Error generating test variation:", error)
      alert("Помилка при створенні варіанту тесту")
    } finally {
      setGeneratingVariation(false)
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
            Потрібна авторизація
          </h2>
          <p className="text-gray-300 mb-6">Для доступу до ваших тестів необхідно увійти в акаунт</p>
          <motion.button
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-base font-medium w-full"
            whileHover={{ scale: 1.05, boxShadow: "0 0 10px rgba(59,130,246,0.5)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/login")}
          >
            Войти
          </motion.button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="py-8">
      <div className="flex justify-between items-center mb-8">
        <motion.h1
          className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          Мої тести
        </motion.h1>

        <motion.button
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-sm font-medium"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          onClick={() => navigate("/create-test")}
        >
          Створити тест
        </motion.button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <motion.div
            className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          />
        </div>
      ) : tests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tests.map((test) => (
            <motion.div
              key={test.id}
              className="bg-gray-900/90 backdrop-blur-sm p-6 rounded-xl border border-gray-800"
              whileHover={{ scale: 1.02 }}
            >
              <h3 className="text-xl font-semibold text-white mb-2">{test.title}</h3>

              {test.category && (
                <div
                  className={`inline-block px-2 py-1 rounded-md text-xs font-medium mb-2 
                  ${
                    test.category === "Математика"
                      ? "bg-blue-500/20 text-blue-400"
                      : test.category === "Історія"
                        ? "bg-amber-500/20 text-amber-400"
                        : test.category === "Біологія"
                          ? "bg-green-500/20 text-green-400"
                          : test.category === "Фізика"
                            ? "bg-purple-500/20 text-purple-400"
                            : test.category === "Хімія"
                              ? "bg-pink-500/20 text-pink-400"
                              : test.category === "Інформатика"
                                ? "bg-indigo-500/20 text-indigo-400"
                                : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {test.category}
                </div>
              )}

              {test.is_template && (
                <div className="inline-block ml-2 px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded-md text-xs text-purple-400">
                  Шаблон
                </div>
              )}

              {test.template_id && (
                <div className="inline-block ml-2 px-2 py-1 bg-green-500/20 border border-green-500/30 rounded-md text-xs text-green-400">
                  Варіація
                </div>
              )}

              <div className="flex gap-2 mt-4 flex-wrap">
                <motion.button
                  className="px-4 py-2 bg-blue-600 rounded-lg text-sm"
                  whileHover={{ scale: 1.05 }}
                  onClick={() => navigate(`/take-test/${test.id}`)}
                >
                  Пройти тест
                </motion.button>
                <motion.button
                  className="px-4 py-2 bg-purple-600 rounded-lg text-sm"
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setSelectedTestId(test.id.toString())}
                >
                  Поділитись
                </motion.button>
                <motion.button
                  className="px-4 py-2 bg-green-600 rounded-lg text-sm"
                  whileHover={{ scale: 1.05 }}
                  onClick={() => navigate(`/test-results/${test.id}`)}
                >
                  Результати
                </motion.button>

                {test.category === "Математика" && !test.template_id && (
                  <motion.button
                    className="px-4 py-2 bg-indigo-600 rounded-lg text-sm"
                    whileHover={{ scale: 1.05 }}
                    onClick={() => handleGenerateVariation(test.id)}
                    disabled={generatingVariation}
                  >
                    {generatingVariation ? "Генерація..." : "Створити варіант"}
                  </motion.button>
                )}

                <motion.button
                  className="px-4 py-2 bg-red-600 rounded-lg text-sm"
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setTestToDelete(test)}
                >
                  Видалити
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">У вас ще немає створених тестів</p>
          <motion.button
            className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-sm font-medium"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/create-test")}
          >
            Створити перший тест
          </motion.button>
        </div>
      )}

      {}
      <AnimatePresence>
        {selectedTestId && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gray-900/90 backdrop-blur-sm p-6 rounded-xl border border-gray-800 max-w-md w-full"
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.5 }}
            >
              <h3 className="text-xl font-semibold text-white mb-4">Код вашого тесту</h3>
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="text"
                  value={selectedTestId}
                  readOnly
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white"
                />
                <button
                  onClick={() => copyToClipboard(selectedTestId)}
                  className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Копіювати
                </button>
              </div>
              <button
                onClick={() => setSelectedTestId(null)}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Закрити
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {}
      <AnimatePresence>
        {testToDelete && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gray-900/90 backdrop-blur-sm p-6 rounded-xl border border-gray-800 max-w-md w-full"
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.5 }}
            >
              <h3 className="text-xl font-semibold text-white mb-4">Підтвердження видалення</h3>
              <p className="text-gray-300 mb-6">
                Ви впевнені, що хочете видалити тест "{testToDelete.title}"? Ця дія не може бути скасована.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setTestToDelete(null)}
                  className="flex-1 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                  disabled={deleteLoading}
                >
                  Скасувати
                </button>
                <button
                  onClick={handleDeleteTest}
                  className="flex-1 px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      <span>Видалення...</span>
                    </div>
                  ) : (
                    "Видалити"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default MyTests

