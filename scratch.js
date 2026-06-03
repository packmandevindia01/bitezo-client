const price = 0.880;
const qty = 2;
const isIncl = true;
const extrasTotal = 0.400;
const vatRate = 0.10;
const vatType = 'Inclusive';

const amount = (qty * price) + extrasTotal;
const netValue = amount - 0;
const vatBase = netValue + 0 + 0;
let vatAmount = 0;
const shouldAddVat =
    isIncl === true  ? false :
    isIncl === false ? true  :
    vatType === 'Exclusive';

if (shouldAddVat) {
  vatAmount = vatBase * vatRate;
}

const lineNetAmount = vatBase + vatAmount;

console.log({
  amount,
  netValue,
  vatBase,
  shouldAddVat,
  vatAmount,
  lineNetAmount
});
