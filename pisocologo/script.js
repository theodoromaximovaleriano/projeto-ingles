/* =========================================================
   CONFIGURAÇÕES — edite apenas este bloco
   ========================================================= */
const CONFIG = {
  // WhatsApp do(a) psicólogo(a), com DDI e DDD, só dígitos. Ex.: "5534999999999"
  // Enquanto estiver vazio, o agendamento mostra um aviso em vez de enviar.
  whatsapp: "",
  // Dias em que há atendimento: 0=domingo, 1=segunda ... 6=sábado
  diasAtendimento: [1, 2, 3, 4, 5],
  // Horários oferecidos (formato "HH:MM")
  horarios: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"],
  // Quantos dias de antecedência mínima (0 = pode escolher hoje)
  antecedenciaDias: 1,
  // Quantos meses à frente o calendário permite
  mesesAFrente: 3,
  // E-mail que receberá as mensagens do formulário de contato.
  email: "",
  // Endereço de um serviço de formulário (ex.: Formspree "https://formspree.io/f/xxxxxx").
  // Vazio = o formulário abre o app de e-mail do visitante (mailto), sem enviar nada sozinho.
  formEndpoint: ""
};

/* ---------- Agendamento: calendário + WhatsApp ---------- */
const dlg = document.getElementById("agendamento");
const calGrid = document.getElementById("cal-grid");
const calMes = document.getElementById("cal-mes");
const btnAnt = document.getElementById("cal-ant");
const btnProx = document.getElementById("cal-prox");
const boxHorarios = document.getElementById("horarios-box");
const listaHorarios = document.getElementById("horarios");
const agendStatus = document.getElementById("agend-status");
const agendResumo = document.getElementById("agend-resumo");

const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
const primeiroDia = new Date(hoje); primeiroDia.setDate(hoje.getDate() + CONFIG.antecedenciaDias);
const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + CONFIG.mesesAFrente + 1, 0);
const mesInicial = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

let mesAtual, diaEscolhido, horaEscolhida;

const formatarDia = d => d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
const diaDisponivel = d => d >= primeiroDia && d <= ultimoDia && CONFIG.diasAtendimento.includes(d.getDay());

function desenharCalendario() {
  calMes.textContent = mesAtual.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  calGrid.innerHTML = "";
  ["D", "S", "T", "Q", "Q", "S", "S"].forEach((s, i) => {
    const h = document.createElement("span");
    h.className = "cal__sem"; h.textContent = s;
    h.setAttribute("aria-hidden", "true");
    calGrid.appendChild(h);
  });
  for (let i = 0; i < mesAtual.getDay(); i++) calGrid.appendChild(document.createElement("span"));
  const total = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0).getDate();
  for (let n = 1; n <= total; n++) {
    const data = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), n);
    const b = document.createElement("button");
    b.type = "button"; b.className = "cal__dia"; b.textContent = n;
    b.setAttribute("aria-label", formatarDia(data));
    b.disabled = !diaDisponivel(data);
    const escolhido = diaEscolhido && data.getTime() === diaEscolhido.getTime();
    b.setAttribute("aria-pressed", escolhido ? "true" : "false");
    b.addEventListener("click", () => { diaEscolhido = data; horaEscolhida = null; desenharCalendario(); desenharHorarios(); atualizarResumo(); });
    calGrid.appendChild(b);
  }
  btnAnt.disabled = mesAtual <= mesInicial;
  btnProx.disabled = mesAtual >= new Date(ultimoDia.getFullYear(), ultimoDia.getMonth(), 1);
}

function desenharHorarios() {
  boxHorarios.hidden = !diaEscolhido;
  listaHorarios.innerHTML = "";
  CONFIG.horarios.forEach(h => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "slot"; b.textContent = h;
    b.setAttribute("aria-pressed", h === horaEscolhida ? "true" : "false");
    b.addEventListener("click", () => { horaEscolhida = h; desenharHorarios(); atualizarResumo(); });
    listaHorarios.appendChild(b);
  });
}

function atualizarResumo() {
  agendResumo.textContent = diaEscolhido
    ? `Escolhido: ${formatarDia(diaEscolhido)}${horaEscolhida ? " às " + horaEscolhida : ""}`
    : "Nenhum dia escolhido.";
}

function abrirAgendamento() {
  mesAtual = new Date(mesInicial);
  // Se o mês atual já não tem dias livres, começa no próximo
  const temLivre = d => { for (let n = 1; n <= 31; n++) { const x = new Date(d.getFullYear(), d.getMonth(), n); if (x.getMonth() === d.getMonth() && diaDisponivel(x)) return true; } return false; };
  if (!temLivre(mesAtual)) mesAtual.setMonth(mesAtual.getMonth() + 1);
  diaEscolhido = null; horaEscolhida = null;
  agendStatus.textContent = ""; agendStatus.className = "form__status";
  document.getElementById("agend-nome").value = "";
  desenharCalendario(); desenharHorarios(); atualizarResumo();
  dlg.showModal();
}

document.querySelectorAll("[data-agendar]").forEach(botao => {
  botao.addEventListener("click", e => { e.preventDefault(); fecharMenu(); abrirAgendamento(); });
});
btnAnt.addEventListener("click", () => { mesAtual.setMonth(mesAtual.getMonth() - 1); desenharCalendario(); });
btnProx.addEventListener("click", () => { mesAtual.setMonth(mesAtual.getMonth() + 1); desenharCalendario(); });
dlg.querySelectorAll("[data-fechar]").forEach(b => b.addEventListener("click", () => dlg.close()));
dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); }); // clique fora fecha

document.getElementById("agend-enviar").addEventListener("click", () => {
  const nome = document.getElementById("agend-nome").value.trim();
  const erro = msg => { agendStatus.textContent = msg; agendStatus.className = "form__status erro"; };
  if (!diaEscolhido) return erro("Escolha um dia no calendário.");
  if (!horaEscolhida) return erro("Escolha um horário.");
  if (nome.length < 2) return erro("Informe seu nome.");
  if (!CONFIG.whatsapp) return erro("O WhatsApp do profissional ainda não foi configurado neste site (CONFIG.whatsapp em script.js).");

  const texto = `Olá! Meu nome é ${nome}. Gostaria de agendar uma consulta para ${formatarDia(diaEscolhido)} às ${horaEscolhida}. Aguardo a confirmação, obrigado(a)!`;
  window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
  agendStatus.textContent = "Abrimos o WhatsApp com a mensagem pronta. Falta só tocar em enviar lá.";
  agendStatus.className = "form__status ok";
});

/* Preenche telefone/e-mail na seção de contato, se configurados */
if (CONFIG.whatsapp) {
  const el = document.querySelector('[data-fill="phone"]');
  el.textContent = "+" + CONFIG.whatsapp;
  el.classList.remove("placeholder");
}
if (CONFIG.email) {
  const el = document.querySelector('[data-fill="email"]');
  el.textContent = CONFIG.email;
  el.classList.remove("placeholder");
}

document.getElementById("ano").textContent = new Date().getFullYear();

/* ---------- Menu mobile ---------- */
const menu = document.getElementById("menu");
const toggle = document.querySelector(".menu-toggle");

function fecharMenu() {
  menu.classList.remove("aberto");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Abrir menu");
}
toggle.addEventListener("click", () => {
  const aberto = menu.classList.toggle("aberto");
  toggle.setAttribute("aria-expanded", String(aberto));
  toggle.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
});
menu.querySelectorAll("a").forEach(a => a.addEventListener("click", fecharMenu));
document.addEventListener("keydown", e => { if (e.key === "Escape") fecharMenu(); });

/* ---------- Destaca o link da seção visível ---------- */
const links = document.querySelectorAll(".nav li a");
const observador = new IntersectionObserver(entradas => {
  entradas.forEach(entrada => {
    if (entrada.isIntersecting) {
      links.forEach(l => l.classList.toggle("ativo", l.getAttribute("href") === "#" + entrada.target.id));
    }
  });
}, { rootMargin: "-40% 0px -55% 0px" });
document.querySelectorAll("main section[id]").forEach(s => observador.observe(s));

/* ---------- Formulário ---------- */
const form = document.getElementById("form-contato");
const status = document.getElementById("form-status");

function validar() {
  const regras = {
    nome: v => v.trim().length >= 2 || "Informe seu nome.",
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || "Informe um e-mail válido, como nome@exemplo.com.",
    mensagem: v => v.trim().length >= 10 || "Escreva uma mensagem com pelo menos 10 caracteres."
  };
  let valido = true;
  for (const [campo, regra] of Object.entries(regras)) {
    const input = form.elements[campo];
    const resultado = regra(input.value);
    const erro = document.getElementById("erro-" + campo);
    erro.textContent = resultado === true ? "" : resultado;
    input.setAttribute("aria-invalid", resultado === true ? "false" : "true");
    if (resultado !== true && valido) input.focus();
    if (resultado !== true) valido = false;
  }
  return valido;
}

function mostrar(texto, tipo) {
  status.textContent = texto;
  status.className = "form__status " + tipo;
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  mostrar("", "");
  if (!validar()) {
    mostrar("Corrija os campos indicados e tente novamente.", "erro");
    return;
  }
  const dados = Object.fromEntries(new FormData(form));

  if (CONFIG.formEndpoint) {
    // Envio real para um serviço (Formspree, Getform etc.)
    try {
      const resp = await fetch(CONFIG.formEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(dados)
      });
      if (!resp.ok) throw new Error();
      form.reset();
      mostrar("Mensagem enviada. Responderei em breve.", "ok");
    } catch {
      mostrar("Não foi possível enviar agora. Tente novamente ou use o e-mail ou WhatsApp.", "erro");
    }
  } else if (CONFIG.email) {
    // Sem serviço configurado: abre o app de e-mail do visitante. Nada é enviado automaticamente.
    const assunto = encodeURIComponent("Contato pelo site — " + dados.nome);
    const corpo = encodeURIComponent(`${dados.mensagem}\n\nNome: ${dados.nome}\nE-mail: ${dados.email}`);
    window.location.href = `mailto:${CONFIG.email}?subject=${assunto}&body=${corpo}`;
    mostrar("Abrimos seu aplicativo de e-mail com a mensagem pronta. Falta apenas clicar em enviar lá.", "ok");
  } else {
    mostrar("O envio ainda não está configurado neste site. Defina email ou formEndpoint em script.js.", "erro");
  }
});
