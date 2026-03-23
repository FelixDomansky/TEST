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


// ===== СУММА ПРОПИСЬЮ (БЕЗ undefined)
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
      if (female) {
        str += (n === 1 ? "одна" : n === 2 ? "две" : ones[n]) + " ";
      } else {
        str += ones[n] + " ";
      }
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


// поиск
document.getElementById("search").addEventListener("input", function () {
  const value = this.value.toLowerCase();
  const box = document.getElementById("suggestions");

  if (!value || !products.length) return box.innerHTML = "";

  const results = products
    .filter(p => String(p["Артикул"] || "").toLowerCase().includes(value))
    .slice(0, 5);

  box.innerHTML = results.map(p => `
    <div onclick="selectProduct('${p["Артикул"]}', ${Number(p["Цена"])})">
      ${p["Артикул"]} (${p["Цена"]} ₽)
    </div>
  `).join("");
});

window.selectProduct = function(article, price) {
  document.getElementById("search").value = article;
  document.getElementById("price").value = price;
  document.getElementById("suggestions").innerHTML = "";
};


// ENTER
document.getElementById("search").addEventListener("keydown", function(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    const first = document.querySelector("#suggestions div");
    if (first) first.click();
    addItem();
  }
});

document.getElementById("qty").addEventListener("keydown", function(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    addItem();
  }
});


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


// 🔥 НУЖНАЯ ФУНКЦИЯ
function updateTotal() {
  let total = 0;
  order.forEach(i => total += i.price * i.qty);
  document.getElementById("total").innerText = "Итого: " + total + " ₽";
}

// 👇 ВОТ ЭТА ОДНА СТРОКА ВСЁ ЧИНИТ
window.updateTotal = updateTotal;


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

      <input value="${i.qty}" type="number"
  oninput="
    order[${index}].qty = Number(this.value);
    const row = this.closest('.item');
    row.querySelector('b').innerText = (order[${index}].price * order[${index}].qty) + ' ₽';
    updateTotal();
  ">

<input value="${i.price}" type="number"
  oninput="
    order[${index}].price = Number(this.value);
    const row = this.closest('.item');
    row.querySelector('b').innerText = (order[${index}].price * order[${index}].qty) + ' ₽';
    updateTotal();
  ">

      <b>${i.price * i.qty} ₽</b>

      <button onclick="removeItem(${index})">Удалить</button>
    `;

    box.appendChild(div);
  });

  document.getElementById("total").innerText = "Итого: " + total + " ₽";
}


// дальше всё без изменений...
window.printOrder = function() {
  const win = window.open("", "_blank");
  win.document.write(getPrintHTML());
  win.document.close();
  setTimeout(() => win.print(), 300);
};

window.downloadPDF = function() {
  const win = window.open("", "_blank");
  win.document.write(getPrintHTML());
  win.document.close();
  setTimeout(() => win.print(), 300);
};

window.clearOrder = function() {
  order = [];
  render();
};

});