
(() => {
  'use strict';

  const AUDIO_ID = 'musica-persistente';
  const PLAYER_ID = 'player-persistente';
  const BOTAO_MUSICA_ID = 'controle-musica';
  const ROTAS = ['index.html', 'historia.html', 'sobrenos.html'];

  let navegando = false;

  function rotaPermitida(url) {
    return (
      url.origin === window.location.origin &&
      ROTAS.includes(url.pathname.split('/').pop())
    );
  }

  function atualizarControle(audio, player) {
    const botao = player.querySelector(`#${BOTAO_MUSICA_ID}`);

    if (!botao) return;

    const tocando = !audio.paused;

    botao.textContent = tocando ? 'Ⅱ' : '▶';
    botao.setAttribute(
      'aria-label',
      tocando ? 'Pausar música' : 'Tocar música'
    );
  }

  function criarPlayer() {
    let audio = document.getElementById(AUDIO_ID);

    if (!audio) {
      audio = document.createElement('audio');
      audio.id = AUDIO_ID;
      audio.src = './musica.mp3';
      audio.loop = true;
      audio.preload = 'metadata';
      audio.setAttribute('aria-label', 'Música de fundo');
      audio.style.display = 'none';
      document.body.appendChild(audio);
    }

    let player = document.getElementById(PLAYER_ID);

    if (!player) {
      player = document.createElement('div');
      player.id = PLAYER_ID;
      player.innerHTML = `
        <span class="player-persistente-icone" aria-hidden="true">♫</span>

        <span class="player-persistente-texto">
          <strong>Aliança</strong>
          <small>Tribalistas · música de vocês</small>
        </span>

        <button
          type="button"
          id="${BOTAO_MUSICA_ID}"
          aria-label="Tocar música"
        >▶</button>
      `;

      document.body.appendChild(player);
    }

    const botao = player.querySelector(`#${BOTAO_MUSICA_ID}`);

    // Evita adicionar o mesmo evento mais de uma vez.
    if (botao && botao.dataset.configurado !== 'true') {
      botao.dataset.configurado = 'true';

      botao.addEventListener('click', async () => {
        const texto = player.querySelector('.player-persistente-texto small');

        if (audio.paused) {
          try {
            await audio.play();

            if (texto) {
              texto.textContent = 'Tribalistas · música de vocês';
            }
          } catch (erro) {
            if (texto) {
              texto.textContent = 'Não foi possível tocar. Confira musica.mp3';
            }
          }
        } else {
          audio.pause();
        }

        atualizarControle(audio, player);
      });
    }

    if (audio.dataset.eventosConfigurados !== 'true') {
      audio.dataset.eventosConfigurados = 'true';

      audio.addEventListener('play', () => {
        atualizarControle(audio, player);
      });

      audio.addEventListener('pause', () => {
        atualizarControle(audio, player);
      });

      audio.addEventListener('error', () => {
        const texto = player.querySelector(
          '.player-persistente-texto small'
        );

        if (texto) {
          texto.textContent = 'Coloque musica.mp3 na pasta principal do site';
        }
      });
    }

    atualizarControle(audio, player);

    return { audio, player };
  }

  function prepararAnimacoes() {
    const elementos = document.querySelectorAll(
      '.animar-entrada, .cartao-historia, .cartao-musica'
    );

    if (!('IntersectionObserver' in window)) {
      elementos.forEach(elemento => elemento.classList.add('visivel'));
      return;
    }

    const observador = new IntersectionObserver((entradas, observer) => {
      entradas.forEach(entrada => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('visivel');
          observer.unobserve(entrada.target);
        }
      });
    }, {
      threshold: 0.08
    });

    elementos.forEach(elemento => {
      observador.observe(elemento);
    });
  }

  function prepararFotos() {
    document.querySelectorAll('.galeria img').forEach(imagem => {
      if (imagem.dataset.eventoErroConfigurado === 'true') return;

      imagem.dataset.eventoErroConfigurado = 'true';

      imagem.addEventListener('error', () => {
        imagem.classList.add('foto-com-erro');
        imagem.alt = `Foto não encontrada: ${imagem.getAttribute('src')}`;
      });
    });
  }

  function prepararBotoes() {
    document.querySelectorAll('[data-scroll-top]').forEach(botao => {
      if (botao.dataset.configurado === 'true') return;

      botao.dataset.configurado = 'true';

      botao.addEventListener('click', evento => {
        evento.preventDefault();

        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      });
    });
  }

  function prepararPagina() {
    criarPlayer();
    prepararAnimacoes();
    prepararFotos();
    prepararBotoes();
  }

  async function navegar(url, opcoes = {}) {
    const { adicionarHistorico = true, rolarTopo = true } = opcoes;
    const destino = new URL(url, window.location.href);

    if (!rotaPermitida(destino) || navegando) return;

    if (
      destino.pathname === window.location.pathname &&
      destino.search === window.location.search &&
      destino.hash
    ) {
      document.querySelector(destino.hash)?.scrollIntoView({
        behavior: 'smooth'
      });
      return;
    }

    navegando = true;

    try {
      const resposta = await fetch(destino.href, {
        headers: { 'X-Requested-With': 'fetch' }
      });

      if (!resposta.ok) {
        throw new Error(`Não foi possível carregar a página (${resposta.status}).`);
      }

      const html = await resposta.text();
      const documento = new DOMParser().parseFromString(html, 'text/html');

      if (!documento.body || !documento.title) {
        throw new Error('O documento recebido é inválido.');
      }

      const { audio, player } = criarPlayer();

      // Substitui o conteúdo da página, mas conserva a música e o player.
      document.body.className = documento.body.className;
      document.body.replaceChildren();

      [...documento.body.children].forEach(elemento => {
        if (elemento.tagName !== 'SCRIPT') {
          document.body.appendChild(
            document.importNode(elemento, true)
          );
        }
      });

      document.body.appendChild(audio);
      document.body.appendChild(player);

      document.title = documento.title;

      // Atualiza os estilos declarados no documento recebido.
      const estilosNovos = [
        ...documento.querySelectorAll('link[rel="stylesheet"]')
      ].map(link => link.href);

      document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
        link.remove();
      });

      estilosNovos.forEach(href => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
      });

      // Atualiza a URL somente para navegação iniciada por um link.
      if (adicionarHistorico) {
        history.pushState({}, '', destino.href);
      }

      prepararPagina();

      if (rolarTopo) {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }

      if (destino.hash) {
        requestAnimationFrame(() => {
          document.querySelector(destino.hash)?.scrollIntoView({
            behavior: 'smooth'
          });
        });
      }
    } catch (erro) {
      // A navegação normal funciona como alternativa, inclusive em hospedagens
      // nas quais a requisição fetch não esteja disponível para essas páginas.
      window.location.href = destino.href;
    } finally {
      navegando = false;
    }
  }

  document.addEventListener('click', evento => {
    const link = evento.target.closest('a[href]');

    if (
      !link ||
      evento.defaultPrevented ||
      evento.button !== 0 ||
      evento.metaKey ||
      evento.ctrlKey ||
      evento.shiftKey ||
      evento.altKey ||
      link.target ||
      link.hasAttribute('download')
    ) {
      return;
    }

    const destino = new URL(link.href, window.location.href);

    if (!rotaPermitida(destino)) return;

    // Links para uma seção da mesma página continuam funcionando normalmente.
    if (
      destino.pathname === window.location.pathname &&
      destino.search === window.location.search
    ) {
      return;
    }

    evento.preventDefault();
    navegar(destino.href);
  });

  window.addEventListener('popstate', () => {
    navegar(window.location.href, {
      adicionarHistorico: false,
      rolarTopo: true
    });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', prepararPagina, {
      once: true
    });
  } else {
    prepararPagina();
  }
})();
