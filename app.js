document.addEventListener("DOMContentLoaded", function () {

let products = [];
let order = [];

// загрузка
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


// 🔥 поиск
document.getElementById("search").addEventListener("input", function () {
  const value = this.value.toLowerCase();
  const box = document.getElementById("suggestions");

  if (!value || !products.length) {
    box.innerHTML = "";
    return;
  }

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


// добавить
window.addItem = function() {
  const name = document.getElementById("search").value;
  let price = Number(document.getElementById("price").value);
  const qty = Number(document.getElementById("qty").value) || 1;

  if (!name) return;

  order.push({ name, price: price || 0, qty });

  document.getElementById("search").value = "";
  document.getElementById("price").value = "";
  document.getElementById("qty").value = "";

  render();
};


// удалить
window.removeItem = function(index) {
  order.splice(index, 1);
  render();
};


// 🔥 количество
window.updateQty = function(index, input) {
  order[index].qty = Number(input.value) || 0;
  updateRowAndTotal(input.closest(".item"), index);
};


// 🔥 цена
window.updatePrice = function(index, input) {
  order[index].price = Number(input.value) || 0;
  updateRowAndTotal(input.closest(".item"), index);
};


// 🔥 пересчёт
function updateRowAndTotal(item, index) {
  const sumEl = item.querySelector("b");
  sumEl.innerText = (order[index].price * order[index].qty) + " ₽";

  let total = 0;
  order.forEach(i => total += i.price * i.qty);

  document.getElementById("total").innerText = "Итого: " + total + " ₽";
}


// render
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

      <input value="${i.name}" onchange="order[${index}].name=this.value">
      <input value="${i.qty}" type="number" oninput="updateQty(${index}, this)">
      <input value="${i.price}" type="number" oninput="updatePrice(${index}, this)">
      <b>${i.price * i.qty} ₽</b>

      <button onclick="removeItem(${index})">Удалить</button>
    `;

    box.appendChild(div);
  });

  document.getElementById("total").innerText = "Итого: " + total + " ₽";
}


// ===== НАКЛАДНАЯ (ТВОЯ, НЕ ТРОГАЛ) =====

function getPrintHTML() {

  const name = document.getElementById("name").value;
  const from = document.getElementById("from").value;
  const number = document.getElementById("invoiceNumber").value || "";

  let total = 0;
  order.forEach(i => total += i.price * i.qty);

  let rows = "";
  order.forEach((i, index) => {
    rows += `
      <tr>
        <td>${index + 1}</td>
        <td>${i.name}</td>
        <td>шт</td>
        <td>${i.qty}</td>
        <td>${i.price}</td>
        <td>${i.price * i.qty}</td>
      </tr>
    `;
  });

  return `
  <html>
  <head>
    <style>
      body { font-family: Arial; }
      table { width:100%; border-collapse:collapse; }
      th, td { border:1px solid black; padding:5px; text-align:center; }
      .cut { border-top:2px dashed black; margin:20px 0; }
    </style>
  </head>
  <body>

  ${[1,2].map(() => `
    <div>
      <div style="text-align:right;">от «__» __________ 2026 г.</div>
      <h2>НАКЛАДНАЯ № ${number || "________"}</h2>

      <div><b>Кому:</b> ${name}</div>
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
          </td>
        </tr>

        <tr>
          <td colspan="6" style="text-align:left;">
            <b>Общая сумма по накладной:</b> ${total} ₽
          </td>
        </tr>
      </table>

      <br><br>

      <div style="display:flex; justify-content:space-between;">
        <div>Сдал:<br><br>__________________</div>
        <div>Принял:<br><br>__________________</div>
      </div>
    </div>
  `).join('<div class="cut"></div>')}

  </body>
  </html>
  `;
}


// печать
window.printOrder = function() {
  const win = window.open("", "_blank");
  win.document.write(getPrintHTML());
  win.document.close();
  setTimeout(() => win.print(), 300);
};


// PDF
window.downloadPDF = function() {
  window.printOrder();
};


// очистка
window.clearOrder = function() {
  order = [];
  render();
};

});