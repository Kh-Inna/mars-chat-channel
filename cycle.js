class Cycle {
  // Порождающий полином x³ + x + 1 (1011)
  static GENERATOR_POLY = "1011";

  // Побитовый XOR
  static xor(binStr1, binStr2) {
      let result = '';
      for (let i = 0; i < binStr2.length; i++) {
          result += (binStr1[i] === binStr2[i]) ? '0' : '1';
      }
      return result;
  }

  // Деление многочленов по модулю 2 
  static polynomialDivision(dividend, divisor) {
      let k = divisor.length;
      let tmp = dividend.slice(0, k);

      while (k < dividend.length) {
          if (tmp[0] === '1') {
              tmp = this.xor(divisor, tmp).slice(1) + dividend[k];
          } else {
              tmp = tmp.slice(1) + dividend[k];
          }
          k++;
      }

      // Обработка последних битов
      if (tmp[0] === '1') {
          tmp = this.xor(divisor, tmp);
      }

      return tmp.slice(1); // Возвращаем остаток (3 бита)
  }

  // Кодирование 4 бит в 7 бит
  static coding(bitStr) {
      if (bitStr.length !== 4) {
          throw new Error("Input must be 4 bits");
      }

      // Дополняем исходные 4 бита тремя нулями: m(x) * x³
      const extended = bitStr + "000";

      // Вычисляем остаток от деления extended на порождающий полином
      const remainder = this.polynomialDivision(extended, this.GENERATOR_POLY);

      // Закодированное слово: m(x) * x³ + remainder
      const encoded = (parseInt(bitStr, 2) << 3 | parseInt(remainder, 2))
                     .toString(2)
                     .padStart(7, '0'); // Гарантируем 7 бит

      return encoded;
  }

  // Декодирование 7 бит с исправлением ошибок
  static decoding(bitStr) {
      if (bitStr.length !== 7) {
          throw new Error("Input must be 7 bits");
      }

      // Вычисляем синдром (остаток от деления на порождающий полином)
      const syndrome = this.polynomialDivision(bitStr, this.GENERATOR_POLY);

      // Если синдром нулевой, ошибок нет
      if (syndrome === "000") {
          return bitStr.slice(0, 4); // Возвращаем исходные 4 бита
      }

      // Ищем позицию ошибки (перебором)
      for (let i = 0; i < 7; i++) {
          // Создаём ошибку в i-й позиции
          const errorMask = (1 << (6 - i)).toString(2).padStart(7, '0');
          const testWord = this.xor(bitStr, errorMask);

          // Проверяем, исправлена ли ошибка
          if (this.polynomialDivision(testWord, this.GENERATOR_POLY) === "000") {
              return testWord.slice(0, 4); // Возвращаем исправленные данные
          }
      }

      // Если ошибка не найдена, возвращаем исходные 4 бита (возможно, с ошибкой)
      return bitStr.slice(0, 4);
  }
}

module.exports = { Cycle };