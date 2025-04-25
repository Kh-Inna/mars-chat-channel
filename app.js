const http = require("http")
const express = require("express")
const bodyParser = require("body-parser")
const axios = require("axios") // Добавлен axios для отправки HTTP запросов
const { Cycle } = require("./cycle") // Исправлен импорт

// Константы в соответствии с требованиями
const SEGMENT_SIZE = 100 // Длина сегмента 100 байт
const CHANCE_OF_ERROR = 0.1 // Вероятность ошибки 10%
const CHANCE_OF_FRAME_LOSS = 0.02 // Вероятность потери кадра 2% - добавлено

// URL транспортного уровня для отправки обработанных данных
const TRANSPORT_LAYER_URL = "http://172.20.10.2:8080/transfer" // Добавлен URL транспортного уровня

const app = express()
const sep = (xs, s) => (xs.length ? [xs.slice(0, s), ...sep(xs.slice(s), s)] : [])

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.post("/code", async (req, res) => {
  try {
    console.log("Получен запрос от транспортного уровня:", req.body)

    // Проверка на потерю кадра с вероятностью 2% - добавлено
    if (Math.random() < CHANCE_OF_FRAME_LOSS) {
      console.log("Кадр потерян с вероятностью 2%")
      return res.status(500).send({ error: "Frame lost due to channel error." })
    }

    // Проверка формата входных данных - добавлено
    if (!req.body || !req.body.payload) {
      console.log("Неверный формат сегмента")
      return res.status(400).send({ error: "Invalid segment format." })
    }

    // Кодирование данных
    const queueCoding = makeData(req.body, false) // закодированные данные
    console.log("Закодированные данные:", queueCoding)

    // Внесение ошибки с вероятностью 10%
    const queueMistake = makeMistake(queueCoding) // битые данные
    console.log("Данные с возможной ошибкой:", queueMistake)

    // Декодирование данных и исправление ошибки
    const queueDecrypted = decodingData(queueMistake) // декодированные данные
    console.log("Декодированные данные:", queueDecrypted)

    // Преобразование декодированных данных обратно в JSON
    const decodedJson = returnMyJSON(queueDecrypted)
    console.log("Декодированные данные:", decodedJson)

    // Отправка данных на транспортный уровень - добавлено
    try {
      await axios.post(TRANSPORT_LAYER_URL, decodedJson)
      console.log("Данные успешно отправлены на транспортный уровень")

      // Возвращаем 204 статус (успешная обработка без тела ответа)
      return res.status(204).send()
    } catch (error) {
      console.error("Ошибка при отправке данных на транспортный уровень:", error.message)
      return res.status(500).send({ error: "Error sending data to transport layer." })
    }
  } catch (e) {
    console.error("Ошибка обработки запроса:", e.message)
    res.status(500).send({ error: e.message })
  }
})

app.listen(3050, () => {
  console.log(`Канальный уровень запущен на http://localhost:3050`)
})

/**
 * Подготовка данных для передачи (создание сегментов по 100 байт в бинарном коде)
 * @param data Данные
 * @param cycle Флаг использования циклического кода
 * @returns {*} Закодированные данные
 */
function makeData(data, cycle) {
  const a = new TextEncoder().encode(JSON.stringify(data)) // переводим объект в байтовый массив

  let n = 0 // номер сегмента
  const cod = [""] // список сегментов по 100 байт
  // пройдем по всем байтам
  a.map((el, ind) => {
    const a_bit = sep("00000000".substr(el.toString(2).length) + el.toString(2), 4)

    a_bit.map((el, ind) => {
      a_bit[ind] = Cycle.coding(el)
    })
    cod[n] += a_bit.join("")

    if ((ind + 1) % SEGMENT_SIZE === 0) {
      // разбиваем по 100 байт
      n++
      cod[n] = ""
    }
  })

  return sep(cod.join(""), 7) // Разбиваем на сегменты по 7 бит (для [7,4] кода)
}

/**
 * Создает ошибку в каждом сегменте с вероятностью CHANCE_OF_ERROR
 * @param trueData Исходные данные
 * @returns {*[]} Данные с возможными ошибками
 */
function makeMistake(trueData) {
  const badData = []
  trueData.map((el, index) => {
    if (Math.random() < CHANCE_OF_ERROR) {
      // шанс 10%, что ошибка
      const rand_ind = Math.floor(Math.random() * el.length)
      if (el[rand_ind] === "1") 
        badData[index] = el.substring(0, rand_ind) + "0" + el.substring(rand_ind + 1)
      else 
        badData[index] = el.substring(0, rand_ind) + "1" + el.substring(rand_ind + 1)
    } else badData[index] = el
  })
  return badData
}

/**
 * Декодирование данных и исправление ошибок
 * @param badData Данные с возможными ошибками
 * @param cycle Флаг использования циклического кода
 * @returns {*[]} Исправленные данные
 */
function decodingData(badData) {
  const trueData = []

  badData.map((el, ind) => {
    trueData[ind] = Cycle.decoding(el) // декодировка и исправление ошибки если она есть
  })
  return trueData
}

/**
 * Преобразование декодированных данных обратно в JSON
 * @param decryptedData Декодированные данные
 * @returns {string} JSON строка
 */
function returnMyJSON(decryptedData) {
  const binByte = sep(decryptedData.join(""), 8) // список байтов в 2 коде
  const bytesList = []
  const textDecoder = new TextDecoder()
  binByte.map((el, ind) => {
    bytesList.push(parseInt(el, 2))
  })
  return textDecoder.decode(new Uint8Array(bytesList))
}
