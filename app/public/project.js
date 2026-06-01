const servicesGrid = document.getElementById('servicesGrid');
const refreshBtn = document.getElementById('refreshBtn');

function normalizeHealthPath(path) {
  if (!path) return '';
  return path.startsWith('/') ? path : `/${path}`;
}

function createCard(service, stateText, stateClass) {
  const healthPath = normalizeHealthPath(service.health_path);
  return `
    <article class="service">
      <h3>${service.name}</h3>
      <p>Health endpoint: <code>${healthPath || 'n/a'}</code></p>
      <a class="link" href="${service.url}" target="_blank" rel="noopener noreferrer">${service.url}</a>
      <div class="badge ${stateClass}">${stateText}</div>
    </article>
  `;
}

async function checkHealth(url, healthPath) {
  const endpoint = `${url.replace(/\/$/, '')}${normalizeHealthPath(healthPath)}`;
  try {
    const res = await fetch(endpoint, { method: 'GET', mode: 'cors' });
    return res.ok;
  } catch {
    return false;
  }
}

async function loadServices() {
  servicesGrid.innerHTML = '<p>Cargando servicios...</p>';

  try {
    const res = await fetch('/project/services');
    if (!res.ok) {
      throw new Error(`Error HTTP ${res.status}`);
    }

    const data = await res.json();
    const cards = [];

    for (const service of data.services) {
      const isUp = await checkHealth(service.url, service.health_path);
      const stateText = isUp ? 'Disponible' : 'Sin confirmar';
      const stateClass = isUp ? 'ok' : 'down';
      cards.push(createCard(service, stateText, stateClass));
    }

    servicesGrid.innerHTML = cards.join('');
  } catch (error) {
    servicesGrid.innerHTML = `<p>No se pudo cargar la información de servicios: ${error.message}</p>`;
  }
}

refreshBtn.addEventListener('click', loadServices);
loadServices();
