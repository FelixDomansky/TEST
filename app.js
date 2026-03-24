document.addEventListener("DOMContentLoaded", function () {

let products = [];
let order = [];

// ===== загрузка =====
function loadProducts() {
  const CACHE_KEY = "products_cache";

  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      products = JSON.parse(cached);
    } catch {}
  }

  fetch("products.json?t=" + Date.now())
    .then(res => res.json())
    .then(data => {
      products = data;
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    })
    .catch(() => {
      if (!products.length) alert("Нет интернета и кэш пуст");
    });
}
loadProducts();


// ===== СУММА ПРОПИСЬЮ =====
function numberToText(num) {
  if (!num) return "ноль рублей";

  const ones = ["","один","два","три","четыре","пять","шесть","семь","восемь","девять"];
  const onesFemale = ["","одна","две"];
  const teens = ["десять","одиннадцать","двенадцать","тринадцать","четырнадцать","пятнадцать","шестнадцать","семнадцать","восемнадцать","девятнадцать"];
  const tens = ["","","двадцать","тридцать","сорок","пятьдесят","шестьдесят","семьдесят","восемьдесят","девяносто"];
  const hundreds = ["","сто","двести","триста","четыреста","пятьсот","шестьсот","семьсот","восемьсот","девятьсот"];

  function plural(n, one, two, five) {
    n = Math.abs(n) % 100;
    let n1 = n % 10;
    if (n > 10 && n < 20) return five;
    if (n1 > 1 && n1 < 5) return two;
    if (n1 == 1) return one;
    return five;
  }

  function parse(n, female = false) {
    let str = "";

    if (n >= 100) {
      str += hundreds[Math.floor(n / 100)] + " ";
      n %= 100;
    }

    if (n >= 10 && n <= 19) {
      str += teens[n - 10] + " ";
      return str;
    }

    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    }

    if (n > 0) {
      str += female ? (n === 1 ? "одна" : n === 2 ? "две" : ones[n]) : ones[n];
      str += " ";
    }

    return str;
  }

  let rub = Math.floor(num);
  let result = "";

  if (rub >= 1000000) {
    let millions = Math.floor(rub / 1000000);
    result += parse(millions);
    result += plural(millions, "миллион", "миллиона", "миллионов") + " ";
    rub %= 1000000;
  }

  if (rub >= 1000) {
    let thousands = Math.floor(rub / 1000);
    result += parse(thousands, true);
    result += plural(thousands, "тысяча", "тысячи", "тысяч") + " ";
    rub %= 1000;
  }

  result += parse(rub);
  result += plural(Math.floor(num), "рубль", "рубля", "рублей");

  return result.trim();
}


// ===== поиск =====
document.getElementById("search").addEventListener("input", function () {
  const value = this.value.toLowerCase();
  const box = document.getElementById("suggestions");

  if (!value || !products.length) return box.innerHTML = "";

  const results = products
    .filter(p => String(p["Артикул"] || "").toLowerCase().includes(value))
    .slice(0, 5);

  box.innerHTML = results.map(p => `
    <div onclick="selectProduct('${String(p["Артикул"]).replace(/'/g, "\\'")}', ${Number(p["Цена"] || 0)})">
      ${p["Артикул"]} (${p["Цена"] || 0} ₽)
    </div>
  `).join("");
});

window.selectProduct = function(article, price) {
  document.getElementById("search").value = article;
  document.getElementById("price").value = price || 0;
  document.getElementById("suggestions").innerHTML = "";
};


// ===== ДОБАВИТЬ =====
window.addItem = function() {
  const name = document.getElementById("search").value;
  const price = Number(document.getElementById("price").value);
  const qty = Number(document.getElementById("qty").value) || 1;

  if (!name) return;

  order.push({ name, price: price || 0, qty });

  document.getElementById("search").value = "";
  document.getElementById("price").value = "";
  document.getElementById("qty").value = "";

  render();
};


// ===== удалить =====
window.removeItem = function(index) {
  order.splice(index, 1);
  render();
};


// ===== обновление =====
window.updateQty = function(index, input) {
  order[index].qty = Number(input.value) || 0;
  updateTotals(input.closest(".item"), index);
};

window.updatePrice = function(index, input) {
  order[index].price = Number(input.value) || 0;
  updateTotals(input.closest(".item"), index);
};

function updateTotals(item, index) {
  const sum = order[index].price * order[index].qty;
  item.querySelector("b").innerText = sum + " ₽";

  let total = 0;
  order.forEach(i => total += i.price * i.qty);
  document.getElementById("total").innerText = "Итого: " + total + " ₽";
}


// ===== render =====
function render() {
  const box = document.getElementById("order");
  box.innerHTML = "";

  let total = 0;

  order.forEach((i, index) => {
    total += i.price * i.qty;

    const div = document.createElement("div");
    div.className = "item";

    div.innerHTML = `
      <div class="item-number">№${index + 1}</div>
      <input value="${i.name}">
      <input value="${i.qty}" type="number" oninput="updateQty(${index}, this)">
      <input value="${i.price}" type="number" oninput="updatePrice(${index}, this)">
      <b>${i.price * i.qty} ₽</b>
      <button onclick="removeItem(${index})">Удалить</button>
    `;

    box.appendChild(div);
  });

  document.getElementById("total").innerText = "Итого: " + total + " ₽";
}


// ===== НАКЛАДНАЯ =====
function getPrintHTML() {

  const name = document.getElementById("name").value;
  const from = document.getElementById("from").value;
  const number = document.getElementById("invoiceNumber").value || "";

  const ITEMS = 7;

  function chunk(arr) {
    let r = [];
    for (let i = 0; i < arr.length; i += ITEMS) {
      r.push(arr.slice(i, i + ITEMS));
    }
    return r;
  }

  const chunks = chunk(order);

  let grandTotal = 0;
  order.forEach(i => grandTotal += i.price * i.qty);

  function doc(items, startIndex = 0, isLast = false) {
    let rows = "";
    let total = 0;

    items.forEach((i, index) => {
      total += i.price * i.qty;

      rows += `
        <tr>
          <td>${startIndex + index + 1}</td>
          <td>${i.name}</td>
          <td>шт</td>
          <td>${i.qty}</td>
          <td>${i.price}</td>
          <td>${i.price * i.qty}</td>
        </tr>
      `;
    });

    return `
      <div class="doc">
        <div class="date">от «__» __________ 2026 г.</div>
        <h2>НАКЛАДНАЯ № ${number || "________"}</h2>

        <div><b>Кому:</b> ${name || ""}</div>
        <div><b>От кого:</b> ${from}</div>

        <table>
          <tr>
            <th>№</th>
            <th>Наименование</th>
            <th>Ед</th>
            <th>Кол-во</th>
            <th>Цена</th>
            <th>Сумма</th>
          </tr>

          ${rows}

          <tr>
            <td colspan="6" style="text-align:left;">
              <b>Итого:</b> ${total} ₽
              <br>
              ${numberToText(total)}
            </td>
          </tr>

          ${isLast ? `
          <tr>
            <td colspan="6" style="text-align:left; font-weight:bold;">
              Общая сумма по накладной: ${grandTotal} ₽
            </td>
          </tr>
          ` : ""}

        </table>

        <div class="sign">
          <div class="sign-block">
            Сдал:
            <div class="line"></div>
            <div class="sub">
              <span>подпись</span>
              <span>расшифровка подписи</span>
            </div>
          </div>

          <div class="sign-block">
            Принял:
            <div class="line"></div>
            <div class="sub">
              <span>подпись</span>
              <span>расшифровка подписи</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  let pages = "";
  let globalIndex = 0;

  chunks.forEach((chunk, i) => {
    const isLast = i === chunks.length - 1;

    pages += `
      <div class="page">
        ${doc(chunk, globalIndex, isLast)}
        <div class="cut"></div>
        ${doc(chunk, globalIndex, isLast)}
      </div>
    `;

    globalIndex += chunk.length;
  });

  return `
  <html>
  <head>
    <style>
      @page { size: A4; margin: 0; }
      body { font-family: Arial; margin: 0; }

      .page {
        width: 210mm;
        height: 297mm;
        padding: 10mm;
        box-sizing: border-box;
      }

      .doc {
        height: 135mm;
      }

      table {
        width:100%;
        border-collapse:collapse;
        border:2px solid black;
        font-size:12px;
      }

      th,td {
        border:1px solid black;
        padding:5px;
        text-align:center;
      }

      .sign {
        margin-top:15px;
        display:flex;
        justify-content:space-between;
      }

      .sign-block {
        width:45%;
        font-size:12px;
      }

      .line {
        border-bottom:1px solid black;
        height:20px;
        margin-top:5px;
      }

      .sub {
        display:flex;
        justify-content:space-between;
        font-size:10px;
      }

      .date { text-align:right; }

      .cut {
        height:5mm;
        border-top:2px dashed black;
        margin:5mm 0;
      }
    </style>
  </head>
  <body>
    ${pages}
  </body>
  </html>
  `;
}

// ===== печать =====
window.printOrder = function() {
  const win = window.open("", "_blank");
  win.document.write(getPrintHTML());
  win.document.close();
  setTimeout(() => win.print(), 300);
};


// ===== PDF =====
window.downloadPDF = function() {

  const win = window.open("", "_blank");

  win.document.write(getPrintHTML());
  win.document.close();

  setTimeout(() => {
    win.focus();
    win.print(); // 👉 тут выбираешь "Сохранить как PDF"
  }, 300);

};

// ===== очистка =====
window.clearOrder = function() {
  order = [];
  render();
};

});