const STORAGE_KEY = "weekend-together-state";

function toLocalISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getNextSaturdayISO() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  const daysUntilSaturday = (6 - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + daysUntilSaturday);
  return toLocalISODate(date);
}

function parseLocalDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  if (toLocalISODate(date) !== value) return null;
  return date;
}

const starterState = {
  plan: [],
  votes: {},
  attendance: {
    "Аня": "unknown",
    "Миша": "unknown",
    "Лена": "unknown",
    "Илья": "unknown",
    "Оля": "unknown",
    "Дима": "unknown",
    "Катя": "unknown",
    "Саша": "unknown",
    "Егор": "unknown",
    "Полина": "unknown",
  },
  supplies: [],
  expenses: [],
  customFriends: [],
  meeting: { place: "", time: "", mapUrl: "" },
  rides: {},
  driverStates: {},
  rainPlan: [],
  tasks: [],
  weekendStart: getNextSaturdayISO(),
};

const friends = [
  { name: "Аня", initial: "А", color: "avatar-coral" },
  { name: "Миша", initial: "М", color: "avatar-blue" },
  { name: "Лена", initial: "Л", color: "avatar-lime" },
  { name: "Илья", initial: "И", color: "avatar-violet" },
  { name: "Оля", initial: "О", color: "avatar-coral" },
  { name: "Дима", initial: "Д", color: "avatar-blue" },
  { name: "Катя", initial: "К", color: "avatar-lime" },
  { name: "Саша", initial: "С", color: "avatar-violet" },
  { name: "Егор", initial: "Е", color: "avatar-coral" },
  { name: "Полина", initial: "П", color: "avatar-blue" },
];

const attendanceStatuses = [
  { value: "unknown", label: "Не ответил" },
  { value: "yes", label: "Идёт" },
  { value: "maybe", label: "Под вопросом" },
  { value: "no", label: "Не идёт" },
];

function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.plan) && saved.votes) {
      return {
        ...starterState,
        ...saved,
        attendance: { ...starterState.attendance, ...saved.attendance },
        supplies: Array.isArray(saved.supplies) ? saved.supplies : [],
        expenses: Array.isArray(saved.expenses) ? saved.expenses : [],
        customFriends: Array.isArray(saved.customFriends) ? saved.customFriends : [],
        meeting: saved.meeting && typeof saved.meeting === "object" ? { ...starterState.meeting, ...saved.meeting } : { ...starterState.meeting },
        rides: saved.rides && typeof saved.rides === "object" ? saved.rides : {},
        driverStates: saved.driverStates && typeof saved.driverStates === "object" ? saved.driverStates : {},
        rainPlan: Array.isArray(saved.rainPlan) ? saved.rainPlan : [],
        tasks: Array.isArray(saved.tasks) ? saved.tasks : [],
        weekendStart: parseLocalDate(saved.weekendStart)?.getDay() === 6 ? saved.weekendStart : starterState.weekendStart,
      };
    }
  } catch {
    // Start with a clean plan if browser storage is unavailable or invalid.
  }
  return { ...starterState, plan: [], votes: {} };
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updatePlanCounts(state.plan.length);
}

function updatePlanCounts(count) {
  document.querySelectorAll("[data-plan-count]").forEach((element) => {
    element.textContent = count;
  });
  const summary = document.querySelector("[data-plan-summary]");
  if (summary) summary.textContent = `${count} ${count === 1 ? "ПУНКТ" : "ПУНКТОВ"}`;
}

function showToast(message) {
  const toast = document.querySelector(".toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("visible"), 2200);
}

function renderPlan(state) {
  const list = document.querySelector("[data-itinerary-list]");
  const empty = document.querySelector("[data-empty-plan]");
  if (!list || !empty) return;

  list.replaceChildren();
  empty.hidden = state.plan.length > 0;
  state.plan.forEach((item, index) => {
    const row = document.createElement("li");
    row.className = "itinerary-item";
    const time = document.createElement("span");
    time.className = "itinerary-time";
    time.textContent = item.time || "Время не указано";
    const name = document.createElement("span");
    name.className = "itinerary-name";
    name.textContent = item.name;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-plan";
    remove.setAttribute("aria-label", `Удалить: ${item.name}`);
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      state.plan.splice(index, 1);
      saveState(state);
      renderPlan(state);
    });
    row.append(time, name, remove);
    list.append(row);
  });
  updatePlanCounts(state.plan.length);
}

function addPlanItem(state, name, time) {
  if (!name.trim()) return false;
  if (state.plan.some((item) => item.name === name)) {
    showToast("Эта идея уже есть в плане");
    return false;
  }
  state.plan.push({ name: name.trim(), time: time.trim() });
  saveState(state);
  renderPlan(state);
  showToast("Добавлено в общий план");
  return true;
}

function setupIdeas(state) {
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((filterButton) => {
        const selected = filterButton === button;
        filterButton.classList.toggle("selected", selected);
        filterButton.setAttribute("aria-pressed", String(selected));
      });
      document.querySelectorAll(".idea-card").forEach((card) => {
        card.hidden = filter !== "all" && card.dataset.category !== filter;
      });
      const total = document.querySelector("[data-idea-total]");
      if (total) total.textContent = document.querySelectorAll(".idea-card:not([hidden])").length;
    });
  });

  document.querySelectorAll(".idea-card").forEach((card) => {
    const name = card.querySelector("[data-add-idea]").dataset.addIdea;
    const voteButton = card.querySelector(".vote-button");
    const voteCountElement = voteButton.querySelector("[data-votes]");
    const initialVotes = Number(voteCountElement.textContent);
    const voteCount = Number(state.votes[name] ?? initialVotes);
    voteCountElement.textContent = voteCount;
    voteButton.setAttribute("aria-pressed", String(Boolean(state.votes[`${name}:mine`])));

    voteButton.addEventListener("click", () => {
      const wasVoted = Boolean(state.votes[`${name}:mine`]);
      const current = Number(voteCountElement.textContent);
      state.votes[name] = current + (wasVoted ? -1 : 1);
      state.votes[`${name}:mine`] = !wasVoted;
      voteCountElement.textContent = state.votes[name];
      voteButton.setAttribute("aria-pressed", String(!wasVoted));
      saveState(state);
    });

    card.querySelector("[data-add-idea]").addEventListener("click", (event) => {
      const button = event.currentTarget;
      addPlanItem(state, button.dataset.addIdea, button.dataset.time);
    });
  });
}

function setupPlan(state) {
  setupWeekendPicker(state);
  renderPlan(state);
  setupAttendance(state);
  renderMiniFriends(state);
  renderSupplies(state);
  renderBudget(state);
  renderMeeting(state);
  renderRides(state);
  renderRainPlan(state);
  renderTasks(state);
  setupSharePlan(state);
  const addButton = document.querySelector("[data-add-custom]");
  const nameInput = document.querySelector("#custom-plan-name");
  const timeInput = document.querySelector("#custom-plan-time");
  if (addButton && nameInput && timeInput) {
    const submit = () => {
      if (addPlanItem(state, nameInput.value, timeInput.value)) {
        nameInput.value = "";
        timeInput.value = "";
        nameInput.focus();
      }
    };
    addButton.addEventListener("click", submit);
    [nameInput, timeInput].forEach((input) => input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") submit();
    }));
  }
  document.querySelector("[data-clear-plan]")?.addEventListener("click", () => {
    if (state.plan.length === 0) return;
    state.plan = [];
    saveState(state);
    renderPlan(state);
    showToast("План очищен");
  });
}

function buildShareText(state) {
  const participants = getParticipants(state);
  const statusLabels = {
    unknown: "ещё не ответил(а)",
    yes: "идёт",
    maybe: "пока не решил(а)",
    no: "не идёт",
  };
  const planLines = state.plan.length
    ? state.plan.map((item) => `• ${item.time ? `${item.time} — ` : ""}${item.name}`)
    : ["• Пока ничего не запланировано"];
  const attendanceLines = participants.map((friend) => `• ${friend.name}: ${statusLabels[state.attendance[friend.name]] || statusLabels.unknown}${isDriver(state, friend) ? " · за рулём" : ""}`);
  const supplyLines = state.supplies.length
    ? state.supplies.map((item) => `• ${item.done ? "✓" : "○"} ${item.name}${item.owner ? ` — ${item.owner}` : " — ответственный не назначен"}`)
    : ["• Список пока пуст"];
  const expenseTotal = state.expenses.reduce((total, expense) => total + expense.amount, 0);
  const expenseLines = state.expenses.length
    ? state.expenses.map((expense) => `• ${expense.name}: ${formatMoney(expense.amount)}${expense.paidBy ? ` (заплатил(а) ${expense.paidBy})` : ""}`)
    : ["• Расходы пока не добавлены"];
  const meetingLines = state.meeting.place
    ? [`• ${state.meeting.place}${state.meeting.time ? ` · сбор в ${state.meeting.time}` : ""}`, ...(state.meeting.mapUrl ? [`• ${state.meeting.mapUrl}`] : [])]
    : ["• Место встречи не выбрано"];
  const rideLines = participants.map((person) => {
    const ride = state.rides[person.name];
    if (ride === person.name) return `• ${person.name}: за рулём, ${getSeatCount(state, person)} пассажирских места`;
    if (ride === "self") return `• ${person.name}: добирается самостоятельно`;
    if (ride) return `• ${person.name}: едет с ${ride}`;
    return `• ${person.name}: поездка не выбрана`;
  });
  const rainLines = state.rainPlan.length
    ? state.rainPlan.map((idea) => `• ${idea}`)
    : ["• Запасные идеи не добавлены"];
  const taskLines = state.tasks.length
    ? state.tasks.map((task) => `• ${task.done ? "✓" : "○"} ${task.title}${task.assignee ? ` — ${task.assignee}` : " — исполнитель не назначен"}`)
    : ["• Задач пока нет"];
  return [
    "ПЛАН НА ВЫХОДНЫЕ",
    formatWeekendRange(state.weekendStart),
    "",
    "МАРШРУТ",
    ...planLines,
    "",
    "КТО БУДЕТ",
    ...attendanceLines,
    "",
    "МЕСТО ВСТРЕЧИ",
    ...meetingLines,
    "",
    "ПОЕЗДКИ",
    ...rideLines,
    "",
    "ПЛАН Б НА СЛУЧАЙ ДОЖДЯ",
    ...rainLines,
    "",
    "ЗАДАЧИ ПО ПОДГОТОВКЕ",
    ...taskLines,
    "",
    "ЧТО ВЗЯТЬ",
    ...supplyLines,
    "",
    "БЮДЖЕТ",
    `• Всего: ${formatMoney(expenseTotal)}`,
    `• На человека: ${formatMoney(expenseTotal / participants.length)}`,
    ...expenseLines,
  ].join("\n");
}

function formatMoney(kopecks) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(kopecks / 100);
}

function setupSharePlan(state) {
  const openButton = document.querySelector("[data-share-plan]");
  const dialog = document.querySelector("[data-share-dialog]");
  const textArea = document.querySelector("[data-share-text]");
  const status = document.querySelector("[data-share-status]");
  if (!openButton || !dialog || !textArea || !status) return;

  openButton.addEventListener("click", () => {
    textArea.value = buildShareText(state);
    status.textContent = "Скопируйте и отправьте в чат компании.";
    dialog.showModal();
  });
  document.querySelector("[data-close-share]")?.addEventListener("click", () => dialog.close());
  document.querySelector("[data-copy-share]")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(textArea.value);
      status.textContent = "Скопировано. Можно отправлять друзьям.";
    } catch {
      textArea.focus();
      textArea.select();
      const copied = document.execCommand("copy");
      status.textContent = copied
        ? "Скопировано. Можно отправлять друзьям."
        : "Текст выделен. Скопируйте его вручную.";
    }
  });
}

function renderAttendance(state) {
  const list = document.querySelector("[data-attendance-list]");
  const summary = document.querySelector("[data-attendance-summary]");
  if (!list || !summary) return;

  list.replaceChildren();
  getParticipants(state).forEach((friend) => {
    const row = document.createElement("div");
    row.className = "attendee-row";
    const person = document.createElement("span");
    person.className = "attendee-person";
    const avatar = document.createElement("span");
    avatar.className = `avatar ${friend.color}`;
    avatar.textContent = friend.initial;
    const name = document.createElement("span");
    name.textContent = friend.name;
    person.append(avatar, name);

    const select = document.createElement("select");
    select.className = "attendance-select";
    select.setAttribute("aria-label", `Статус: ${friend.name}`);
    attendanceStatuses.forEach((status) => {
      const option = document.createElement("option");
      option.value = status.value;
      option.textContent = status.label;
      select.append(option);
    });
    select.value = state.attendance[friend.name] || "unknown";
    select.addEventListener("change", () => {
      state.attendance[friend.name] = select.value;
      saveState(state);
      updateAttendanceSummary(state, summary);
    });
    const driverLabel = document.createElement("label");
    driverLabel.className = "driver-toggle";
    const driverCheckbox = document.createElement("input");
    driverCheckbox.type = "checkbox";
    driverCheckbox.checked = isDriver(state, friend);
    driverCheckbox.setAttribute("aria-label", `${friend.name}: за рулём`);
    driverCheckbox.addEventListener("change", () => {
      const driverState = friend.custom ? friend : (state.driverStates[friend.name] ||= {});
      driverState.driving = driverCheckbox.checked;
      if (driverState.driving) {
        driverState.seats = getSeatCount(state, friend);
        state.rides[friend.name] = friend.name;
      } else {
        Object.keys(state.rides).forEach((person) => {
          if (state.rides[person] === friend.name) state.rides[person] = "";
        });
      }
      saveState(state);
      renderAttendance(state);
      renderRides(state);
    });
    const driverText = document.createElement("span");
    driverText.textContent = "За рулём";
    driverLabel.append(driverCheckbox, driverText);
    const driverControls = document.createElement("div");
    driverControls.className = "driver-controls";
    driverControls.append(driverLabel);
    if (isDriver(state, friend)) {
      const capacityLabel = document.createElement("label");
      capacityLabel.className = "seat-capacity";
      capacityLabel.textContent = "Мест";
      const capacity = document.createElement("input");
      capacity.type = "number";
      capacity.min = "1";
      capacity.max = "8";
      capacity.step = "1";
      capacity.value = String(getSeatCount(state, friend));
      capacity.setAttribute("aria-label", `${friend.name}: пассажирских мест`);
      capacity.addEventListener("change", () => {
        const seats = Number(capacity.value);
        if (!Number.isInteger(seats) || seats < 1 || seats > 8) {
          capacity.value = String(getSeatCount(state, friend));
          return;
        }
        const driverState = friend.custom ? friend : (state.driverStates[friend.name] ||= {});
        driverState.seats = seats;
        saveState(state);
        renderRides(state);
      });
      capacityLabel.append(capacity);
      driverControls.append(capacityLabel);
    }
    row.append(person, select, driverControls);

    if (friend.custom) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-participant";
      remove.setAttribute("aria-label", `Удалить участника ${friend.name}`);
      remove.textContent = "×";
      remove.addEventListener("click", () => {
        state.customFriends = state.customFriends.filter((participant) => participant !== friend);
        delete state.attendance[friend.name];
        delete state.rides[friend.name];
        Object.keys(state.rides).forEach((person) => {
          if (state.rides[person] === friend.name) state.rides[person] = "";
        });
        state.supplies.forEach((item) => {
          if (item.owner === friend.name) item.owner = "";
        });
        state.tasks.forEach((task) => {
          if (task.assignee === friend.name) task.assignee = "";
        });
        saveState(state);
        renderAttendance(state);
        renderMiniFriends(state);
        refreshPersonSelects(state);
        updateBudgetSummary(state);
        renderRides(state);
        renderTasks(state);
      });
      row.append(remove);
    }
    list.append(row);
  });
  updateAttendanceSummary(state, summary);
}

function updateAttendanceSummary(state, summary) {
  const participants = getParticipants(state);
  const attending = participants.filter((friend) => state.attendance[friend.name] === "yes").length;
  const unanswered = participants.filter((friend) => ["unknown", "maybe"].includes(state.attendance[friend.name])).length;
  summary.textContent = `Идут: ${attending} из ${participants.length} · ждут ответа: ${unanswered}`;
}

function getParticipants(state) {
  return [...friends, ...state.customFriends];
}

function isDriver(state, person) {
  return Boolean(person.custom ? person.driving : state.driverStates[person.name]?.driving);
}

function getSeatCount(state, person) {
  const seats = person.custom ? person.seats : state.driverStates[person.name]?.seats;
  return Math.min(8, Math.max(1, Number(seats) || 3));
}

function populatePersonSelect(select, participants, placeholder, selectedValue = "") {
  select.replaceChildren();
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = placeholder;
  select.append(emptyOption);
  participants.forEach((participant) => {
    const option = document.createElement("option");
    option.value = participant.name;
    option.textContent = participant.name;
    select.append(option);
  });
  select.value = selectedValue;
}

function refreshPersonSelects(state) {
  const participants = getParticipants(state);
  document.querySelectorAll(".supply-owner").forEach((select) => {
    const selectedValue = participants.some((person) => person.name === select.value) ? select.value : "";
    populatePersonSelect(select, participants, "Кто возьмёт?", selectedValue);
  });
  const payer = document.querySelector("[data-expense-payer]");
  if (payer) {
    const selectedValue = participants.some((person) => person.name === payer.value) ? payer.value : "";
    populatePersonSelect(payer, participants, "Кто платит?", selectedValue);
  }
}

function renderMiniFriends(state) {
  const list = document.querySelector("[data-mini-friends]");
  if (!list) return;
  list.replaceChildren();
  const participants = getParticipants(state);
  participants.slice(0, 4).forEach((friend) => {
    const avatar = document.createElement("span");
    avatar.className = `avatar ${friend.color}`;
    avatar.textContent = friend.initial;
    list.append(avatar);
  });
  if (participants.length > 4) {
    const extra = document.createElement("span");
    extra.className = "avatar avatar-violet avatar-extra";
    extra.textContent = `+${participants.length - 4}`;
    list.append(extra);
  }
  const count = document.createElement("b");
  count.textContent = `${participants.length} ${participants.length === 1 ? "участник" : "участников"}`;
  list.append(count);
}

function setupAttendance(state) {
  renderAttendance(state);
  const nameInput = document.querySelector("[data-participant-name]");
  const addButton = document.querySelector("[data-add-participant]");
  if (!nameInput || !addButton) return;

  const addParticipant = () => {
    const name = nameInput.value.trim();
    if (!name) return;
    if (getParticipants(state).some((person) => person.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      showToast("Этот участник уже в списке");
      return;
    }
    const colors = ["avatar-coral", "avatar-blue", "avatar-lime", "avatar-violet"];
    state.customFriends.push({
      name,
      initial: name.charAt(0).toLocaleUpperCase(),
      color: colors[state.customFriends.length % colors.length],
      custom: true,
      driving: false,
    });
    state.attendance[name] = "unknown";
    nameInput.value = "";
    saveState(state);
    renderAttendance(state);
    renderMiniFriends(state);
    refreshPersonSelects(state);
    updateBudgetSummary(state);
    renderRides(state);
    nameInput.focus();
  };
  addButton.addEventListener("click", addParticipant);
  nameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") addParticipant();
  });
}

function renderSupplies(state) {
  const list = document.querySelector("[data-supply-list]");
  const empty = document.querySelector("[data-supply-empty]");
  const nameInput = document.querySelector("[data-supply-name]");
  const addButton = document.querySelector("[data-add-supply]");
  if (!list || !empty || !nameInput || !addButton) return;

  const render = () => {
    list.replaceChildren();
    empty.hidden = state.supplies.length > 0;
    state.supplies.forEach((item) => {
      const row = document.createElement("li");
      row.className = `supply-row${item.done ? " is-done" : ""}`;
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(item.done);
      checkbox.setAttribute("aria-label", `Отметить готовым: ${item.name}`);
      checkbox.addEventListener("change", () => {
        item.done = checkbox.checked;
        saveState(state);
        row.classList.toggle("is-done", item.done);
      });

      const itemName = document.createElement("span");
      itemName.className = "supply-name";
      itemName.textContent = item.name;

      const owner = document.createElement("select");
      owner.className = "supply-owner";
      owner.setAttribute("aria-label", `Ответственный за: ${item.name}`);
      populatePersonSelect(owner, getParticipants(state), "Кто возьмёт?", item.owner || "");
      owner.addEventListener("change", () => {
        item.owner = owner.value;
        saveState(state);
      });

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-supply";
      remove.setAttribute("aria-label", `Удалить из списка: ${item.name}`);
      remove.textContent = "×";
      remove.addEventListener("click", () => {
        state.supplies.splice(state.supplies.indexOf(item), 1);
        saveState(state);
        render();
      });
      row.append(checkbox, itemName, owner, remove);
      list.append(row);
    });
  };

  const addSupply = () => {
    const name = nameInput.value.trim();
    if (!name) return;
    state.supplies.push({ name, owner: "", done: false });
    nameInput.value = "";
    saveState(state);
    render();
    nameInput.focus();
  };
  addButton.addEventListener("click", addSupply);
  nameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") addSupply();
  });
  render();
}

function renderBudget(state) {
  const list = document.querySelector("[data-expense-list]");
  const empty = document.querySelector("[data-expense-empty]");
  const totalElement = document.querySelector("[data-budget-total]");
  const shareElement = document.querySelector("[data-budget-share]");
  const nameInput = document.querySelector("[data-expense-name]");
  const amountInput = document.querySelector("[data-expense-amount]");
  const payerSelect = document.querySelector("[data-expense-payer]");
  const addButton = document.querySelector("[data-add-expense]");
  if (!list || !empty || !totalElement || !shareElement || !nameInput || !amountInput || !payerSelect || !addButton) return;

  populatePersonSelect(payerSelect, getParticipants(state), "Кто платит?");

  const render = () => {
    list.replaceChildren();
    empty.hidden = state.expenses.length > 0;
    updateBudgetSummary(state, totalElement, shareElement);
    state.expenses.forEach((expense) => {
      const row = document.createElement("li");
      row.className = "expense-row";
      const details = document.createElement("span");
      details.className = "expense-details";
      details.textContent = `${expense.name}${expense.paidBy ? ` · ${expense.paidBy}` : ""}`;
      const amount = document.createElement("strong");
      amount.textContent = formatMoney(expense.amount);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-expense";
      remove.setAttribute("aria-label", `Удалить расход: ${expense.name}`);
      remove.textContent = "×";
      remove.addEventListener("click", () => {
        state.expenses.splice(state.expenses.indexOf(expense), 1);
        saveState(state);
        render();
      });
      row.append(details, amount, remove);
      list.append(row);
    });
  };

  const addExpense = () => {
    const name = nameInput.value.trim();
    const amount = Number(amountInput.value);
    if (!name || !Number.isFinite(amount) || amount <= 0) {
      showToast("Укажите название и сумму больше нуля");
      return;
    }
    state.expenses.push({
      name,
      amount: Math.round(amount * 100),
      paidBy: payerSelect.value,
    });
    nameInput.value = "";
    amountInput.value = "";
    payerSelect.value = "";
    saveState(state);
    render();
    nameInput.focus();
  };
  addButton.addEventListener("click", addExpense);
  [nameInput, amountInput].forEach((input) => input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") addExpense();
  }));
  render();
}

function updateBudgetSummary(state, totalElement = document.querySelector("[data-budget-total]"), shareElement = document.querySelector("[data-budget-share]")) {
  if (!totalElement || !shareElement) return;
  const total = state.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const participantCount = getParticipants(state).length;
  totalElement.textContent = formatMoney(total);
  shareElement.textContent = `${formatMoney(total / participantCount)} на человека`;
}

function renderMeeting(state) {
  const placeInput = document.querySelector("[data-meeting-place]");
  const timeInput = document.querySelector("[data-meeting-time]");
  const urlInput = document.querySelector("[data-meeting-url]");
  const saveButton = document.querySelector("[data-save-meeting]");
  const preview = document.querySelector("[data-meeting-preview]");
  const previewPlace = document.querySelector("[data-meeting-preview-place]");
  const previewTime = document.querySelector("[data-meeting-preview-time]");
  const mapLink = document.querySelector("[data-meeting-map]");
  if (!placeInput || !timeInput || !urlInput || !saveButton || !preview || !previewPlace || !previewTime || !mapLink) return;

  placeInput.value = state.meeting.place;
  timeInput.value = state.meeting.time;
  urlInput.value = state.meeting.mapUrl;
  const render = () => {
    preview.hidden = !state.meeting.place;
    previewPlace.textContent = state.meeting.place;
    previewTime.textContent = state.meeting.time ? `Сбор в ${state.meeting.time}` : "";
    mapLink.hidden = !state.meeting.mapUrl;
    mapLink.href = state.meeting.mapUrl;
  };
  saveButton.addEventListener("click", () => {
    const place = placeInput.value.trim();
    const mapUrl = urlInput.value.trim();
    if (mapUrl) {
      try {
        const parsedUrl = new URL(mapUrl);
        if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("Unsupported URL protocol");
      } catch {
        showToast("Вставьте полную ссылку на карту или оставьте поле пустым");
        return;
      }
    }
    state.meeting = { place, time: timeInput.value, mapUrl };
    saveState(state);
    render();
    showToast(place ? "Место встречи сохранено" : "Место встречи очищено");
  });
  render();
}

function renderRides(state) {
  const list = document.querySelector("[data-rides-list]");
  const summary = document.querySelector("[data-rides-summary]");
  if (!list || !summary) return;
  const participants = getParticipants(state);
  const drivers = participants.filter((person) => isDriver(state, person));
  list.replaceChildren();
  let assignedPassengers = 0;
  let availableSeats = 0;

  participants.forEach((person) => {
    const row = document.createElement("div");
    row.className = "ride-row";
    const name = document.createElement("span");
    name.className = "ride-name";
    name.textContent = person.name;
    const select = document.createElement("select");
    select.setAttribute("aria-label", `Поездка для ${person.name}`);
    const unassigned = document.createElement("option");
    unassigned.value = "";
    unassigned.textContent = "Выбрать поездку";
    select.append(unassigned);
    const selfTravel = document.createElement("option");
    selfTravel.value = "self";
    selfTravel.textContent = "Самостоятельно";
    select.append(selfTravel);
    drivers.forEach((driver) => {
      const seatCount = getSeatCount(state, driver);
      const occupied = participants.filter((rider) => rider.name !== driver.name && state.rides[rider.name] === driver.name).length;
      if (driver.name === person.name) {
        const ownCar = document.createElement("option");
        ownCar.value = driver.name;
        ownCar.textContent = "За рулём";
        select.append(ownCar);
      } else {
        const option = document.createElement("option");
        option.value = driver.name;
        option.textContent = `${driver.name} · ${occupied}/${seatCount} мест`;
        option.disabled = occupied >= seatCount && state.rides[person.name] !== driver.name;
        select.append(option);
      }
      availableSeats += driver.name === person.name ? seatCount : 0;
    });
    const selectedRide = state.rides[person.name] || "";
    select.value = selectedRide;
    if (select.value !== selectedRide) state.rides[person.name] = "";
    if (drivers.some((driver) => driver.name !== person.name && state.rides[person.name] === driver.name)) assignedPassengers += 1;
    select.addEventListener("change", () => {
      state.rides[person.name] = select.value;
      saveState(state);
      renderRides(state);
    });
    row.append(name, select);
    list.append(row);
  });

  const remainingSeats = Math.max(0, availableSeats - assignedPassengers);
  summary.textContent = drivers.length
    ? `Пассажиров распределено: ${assignedPassengers} · свободных мест: ${remainingSeats}`
    : "Пока нет водителей. Отметьте «За рулём» у участника выше.";
}

function renderRainPlan(state) {
  const list = document.querySelector("[data-rain-list]");
  const empty = document.querySelector("[data-rain-empty]");
  const input = document.querySelector("[data-rain-idea]");
  const addButton = document.querySelector("[data-add-rain-idea]");
  if (!list || !empty || !input || !addButton) return;

  const render = () => {
    list.replaceChildren();
    empty.hidden = state.rainPlan.length > 0;
    state.rainPlan.forEach((idea, index) => {
      const item = document.createElement("li");
      item.className = "rain-plan-item";
      const name = document.createElement("span");
      name.textContent = idea;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.setAttribute("aria-label", `Удалить запасную идею: ${idea}`);
      remove.textContent = "×";
      remove.addEventListener("click", () => {
        state.rainPlan.splice(index, 1);
        saveState(state);
        render();
      });
      item.append(name, remove);
      list.append(item);
    });
  };

  const addIdea = () => {
    const idea = input.value.trim();
    if (!idea) return;
    if (state.rainPlan.some((savedIdea) => savedIdea.toLocaleLowerCase() === idea.toLocaleLowerCase())) {
      showToast("Эта идея уже есть в плане Б");
      return;
    }
    state.rainPlan.push(idea);
    input.value = "";
    saveState(state);
    render();
    input.focus();
  };
  addButton.addEventListener("click", addIdea);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") addIdea();
  });
  render();
}

function renderTasks(state) {
  const list = document.querySelector("[data-task-list]");
  const empty = document.querySelector("[data-tasks-empty]");
  const input = document.querySelector("[data-task-name]");
  const ownerSelect = document.querySelector("[data-task-owner]");
  const addButton = document.querySelector("[data-add-task]");
  if (!list || !empty || !input || !ownerSelect || !addButton) return;

  populatePersonSelect(ownerSelect, getParticipants(state), "Без исполнителя");
  const render = () => {
    list.replaceChildren();
    empty.hidden = state.tasks.length > 0;
    state.tasks.forEach((task, index) => {
      const row = document.createElement("li");
      row.className = `task-item${task.done ? " is-done" : ""}`;
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(task.done);
      checkbox.setAttribute("aria-label", `Отметить задачу выполненной: ${task.title}`);
      checkbox.addEventListener("change", () => {
        task.done = checkbox.checked;
        saveState(state);
        row.classList.toggle("is-done", task.done);
      });
      const title = document.createElement("span");
      title.className = "task-title";
      title.textContent = task.title;
      const assignee = document.createElement("select");
      assignee.setAttribute("aria-label", `Исполнитель: ${task.title}`);
      populatePersonSelect(assignee, getParticipants(state), "Без исполнителя", task.assignee || "");
      assignee.addEventListener("change", () => {
        task.assignee = assignee.value;
        saveState(state);
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.setAttribute("aria-label", `Удалить задачу: ${task.title}`);
      remove.textContent = "×";
      remove.addEventListener("click", () => {
        state.tasks.splice(index, 1);
        saveState(state);
        render();
      });
      row.append(checkbox, title, assignee, remove);
      list.append(row);
    });
  };

  const addTask = () => {
    const title = input.value.trim();
    if (!title) return;
    if (state.tasks.some((task) => task.title.toLocaleLowerCase() === title.toLocaleLowerCase())) {
      showToast("Такая задача уже есть в списке");
      return;
    }
    state.tasks.push({ title, assignee: ownerSelect.value, done: false });
    input.value = "";
    ownerSelect.value = "";
    saveState(state);
    render();
    input.focus();
  };
  addButton.addEventListener("click", addTask);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") addTask();
  });
  render();
}

function formatWeekendRange(startDate) {
  const saturday = parseLocalDate(startDate) || parseLocalDate(starterState.weekendStart);
  const sunday = new Date(saturday);
  sunday.setDate(sunday.getDate() + 1);
  const dateFormatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });
  const saturdayMonth = dateFormatter.format(saturday).replace(/^\d+\s*/, "");
  const sundayMonth = dateFormatter.format(sunday).replace(/^\d+\s*/, "");
  const range = saturdayMonth === sundayMonth
    ? `${saturday.getDate()}–${sunday.getDate()} ${saturdayMonth}`
    : `${dateFormatter.format(saturday)} – ${dateFormatter.format(sunday)}`;
  return range.toLocaleUpperCase("ru-RU");
}

function renderWeekendDates(state) {
  const saturday = parseLocalDate(state.weekendStart) || parseLocalDate(starterState.weekendStart);
  const saturdayLabel = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" })
    .format(saturday)
    .toLocaleUpperCase("ru-RU");
  document.querySelectorAll("[data-weekend-range]").forEach((element) => {
    element.textContent = formatWeekendRange(state.weekendStart);
  });
  document.querySelectorAll("[data-weekend-saturday]").forEach((element) => {
    element.textContent = saturdayLabel;
  });
}

function setupWeekendPicker(state) {
  const picker = document.querySelector("[data-weekend-start]");
  if (!picker) return;
  picker.value = state.weekendStart;
  picker.min = toLocalISODate(new Date());
  renderWeekendDates(state);
  picker.addEventListener("change", () => {
    const selectedDate = parseLocalDate(picker.value);
    if (!selectedDate || selectedDate.getDay() !== 6) {
      picker.value = state.weekendStart;
      showToast("Выберите субботу, чтобы воскресенье добавилось автоматически");
      return;
    }
    state.weekendStart = picker.value;
    saveState(state);
    renderWeekendDates(state);
    showToast(`Выбраны выходные: ${formatWeekendRange(state.weekendStart)}`);
  });
}

function setupInvite() {
  document.querySelector("[data-invite]")?.addEventListener("click", async () => {
    const inviteUrl = window.location.href;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      showToast("Ссылка на план скопирована");
    } catch {
      showToast("Отправьте друзьям ссылку на эту страницу");
    }
  });
}

const state = readState();
updatePlanCounts(state.plan.length);
renderWeekendDates(state);
if (document.body.dataset.page === "ideas") setupIdeas(state);
if (document.body.dataset.page === "plan") setupPlan(state);
if (document.body.dataset.page === "home") setupInvite();