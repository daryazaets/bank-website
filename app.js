let state = Object.freeze({
  account: null
});

const storageKey = 'savedAccount';

const routes = {
  '/login': { templateId: 'login', updateHeader: setAnonymousHeader },
  '/register': { templateId: 'register', updateHeader: setAnonymousHeader },
  '/dashboard': { templateId: 'dashboard', init: refresh, updateHeader: setLoggedInHeader },
  '/transaction': { templateId: 'add-transaction', }
};


function updateRoute() {
  const path = window.location.pathname;
  const route = routes[path];
  if (!route) {
    return navigate('/dashboard');
  }

  const template = document.getElementById(route.templateId);
  const view = template.content.cloneNode(true);
  const app = document.getElementById('app');
  app.innerHTML = '';
  app.appendChild(view);

  if (typeof route.updateHeader === 'function') {
    route.updateHeader();
  }
  if (typeof route.init === 'function') {
    route.init();
  }
}

function setAnonymousHeader() {
  document.getElementById('header-login-link').classList.remove('hidden');
  document.getElementById('header-register-link').classList.remove('hidden');
  document.getElementById('header-logout-link').classList.add('hidden');
}

function setLoggedInHeader() {
  document.getElementById('header-login-link').classList.add('hidden');
  document.getElementById('header-register-link').classList.add('hidden');
  document.getElementById('header-logout-link').classList.remove('hidden');
}

function navigate(path) {
  window.history.pushState({}, path, path);
  updateRoute();
}

function onLinkClick(event) {
  event.preventDefault();
  navigate(event.target.href);
}

async function createAccount(account) {
  try {
    const response = await fetch('//localhost:4000/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: account
    });
    return await response.json();
  } catch (error) {
    return { error: error.message || 'Unknown error' };
  }
}

async function register() {
  const registerForm = document.getElementById('registerForm');
  const formData = new FormData(registerForm);
  const data = Object.fromEntries(formData);
  const jsonData = JSON.stringify(data);
  const result = await createAccount(jsonData);

  if (result.error) {
    return updateElement('registerError', result.error);
  }
  console.log('Account created!', result);
  updateState('account', result);
  navigate('/dashboard');
}

async function login() {
  const loginForm = document.getElementById('loginForm')
  const user = loginForm.user.value;
  const data = await getAccount(user);

  if (data.error) {
    return updateElement('loginError', data.error);
  }
  updateState('account', data);
  navigate('/dashboard');
}

async function createTransaction(user, transaction) {
  try {
    const response = await fetch(`//localhost:4000/api/accounts/${user}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction)
    });
    return await response.json();
  } catch (error) {
    return { error: error.message || 'Unknown error' };
  }
}

async function transaction() {
  const transactionForm = document.getElementById('transactionForm');
  const formData = new FormData(transactionForm);
  const data = Object.fromEntries(formData);

  const user = state.account.user
  const result = await createTransaction(user, data);

  console.log('Transaction added!', result);
  updateState('transaction', result);
  navigate('/dashboard');
}

async function getAccount(user) {
  try {
    const response = await fetch('//localhost:4000/api/accounts/' + encodeURIComponent(user));
    return await response.json();
  } catch (error) {
    return { error: error.message || 'Unknown error' };
  }
}

function updateElement(id, textOrNode) {
  const element = document.getElementById(id);
  element.textContent = '';
  element.append(textOrNode);
}

function updateDashboard() {
  const account = state.account;
  if (!account) {
    return logout();
  }
  const transactionsRows = document.createDocumentFragment();
  for (const transaction of account.transactions) {
    const transactionRow = createTransactionRow(transaction);
    transactionsRows.appendChild(transactionRow);
  }
  updateElement('transactions', transactionsRows);
  updateElement('description', account.description);
  updateElement('balance', account.balance.toFixed(2));
  updateElement('currency', account.currency);
}

function createTransactionRow(transaction) {
  const template = document.getElementById('transaction');
  const transactionRow = template.content.cloneNode(true);
  const tr = transactionRow.querySelector('tr');
  tr.children[0].textContent = transaction.date;
  tr.children[1].textContent = transaction.object;
  tr.children[2].textContent = transaction.amount.toFixed(2);
  return transactionRow;
}

function updateState(property, newData) {
  state = Object.freeze({
    ...state,
    [property]: newData
  });
  localStorage.setItem(storageKey, JSON.stringify(state.account));
}

function logout() {
  updateState('account', null);
  navigate('/login');
}

function cancel() {
  navigate('/dashboard');
}

function init() {
  const savedAccount = localStorage.getItem(storageKey);
  if (savedAccount) {
    updateState('account', JSON.parse(savedAccount));
  }

  // Our previous initialization code
  window.onpopstate = () => updateRoute();
  updateRoute();
}

init();

async function updateAccountData() {
  const account = state.account;
  if (!account) {
    return logout();
  }

  const data = await getAccount(account.user);
  if (data.error) {
    return logout();
  }

  updateState('account', data);
}

async function refresh() {
  await updateAccountData();
  updateDashboard();
}