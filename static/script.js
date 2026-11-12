const API_BASE_URL = '/clientes';

const clienteForm = document.getElementById('clienteForm');
const clientesList = document.getElementById('clientesList');
const loading = document.getElementById('loading');
const searchInput = document.getElementById('searchInput');
const btnCancelar = document.getElementById('btnCancelar');
const formTitle = document.getElementById('form-title');
const confirmModal = document.getElementById('confirmModal');
const confirmMessage = document.getElementById('confirmMessage');
const confirmYes = document.getElementById('confirmYes');
const confirmNo = document.getElementById('confirmNo');
const campoTelefone = document.getElementById('telefone');
const campoCpf = document.getElementById('cpf');

let clienteParaExcluir = null;
let editando = false;

document.addEventListener('DOMContentLoaded', () => {
    carregarClientes();

    clienteForm.addEventListener('submit', salvarCliente);
    btnCancelar.addEventListener('click', cancelarEdicao);
    confirmYes.addEventListener('click', confirmarExclusao);
    confirmNo.addEventListener('click', fecharModal);

    campoCpf.addEventListener('input', () => {
        campoCpf.value = formatarCpf(campoCpf.value);
    });

    campoTelefone.addEventListener('input', () => {
        campoTelefone.value = formatarTelefone(campoTelefone.value);
    });

    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
            fecharModal();
        }
    });
});

function escaparHtml(texto) {
    const div = document.createElement('div');
    div.textContent = texto == null ? '' : String(texto);
    return div.innerHTML;
}

function soDigitos(valor) {
    return (valor || '').replace(/\D/g, '');
}

function formatarCpf(valor) {
    return soDigitos(valor)
        .slice(0, 11)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function formatarTelefone(valor) {
    const d = soDigitos(valor).slice(0, 11);
    if (d.length === 0) return '';
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

async function mensagemDeErro(response, padrao) {
    try {
        const corpo = await response.json();
        if (corpo && corpo.mensagem) {
            return corpo.mensagem;
        }
    } catch (e) {
        return padrao;
    }
    return padrao;
}

async function carregarClientes() {
    try {
        mostrarLoading(true);
        const response = await fetch(API_BASE_URL);

        if (!response.ok) {
            throw new Error('Erro ao carregar clientes');
        }

        const clientes = await response.json();
        exibirClientes(clientes);
    } catch (error) {
        console.error('Erro:', error);
        clientesList.innerHTML = `
            <div class="empty-state">
                <h3>❌ Erro ao carregar clientes</h3>
                <p>Verifique se o servidor está rodando na porta 8080</p>
            </div>
        `;
    } finally {
        mostrarLoading(false);
    }
}

async function salvarCliente(event) {
    event.preventDefault();

    const clienteId = document.getElementById('clienteId').value;

    const cliente = {
        nome: document.getElementById('nome').value.trim(),
        email: document.getElementById('email').value.trim(),
        telefone: soDigitos(campoTelefone.value),
        cpf: soDigitos(campoCpf.value)
    };

    const estavaEditando = editando;

    try {
        let response;

        if (estavaEditando) {
            response = await fetch(`${API_BASE_URL}/${clienteId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(cliente)
            });
        } else {
            response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(cliente)
            });
        }

        if (!response.ok) {
            throw new Error(await mensagemDeErro(response, 'Erro ao salvar cliente'));
        }

        const clienteSalvo = await response.json();
        console.log('Cliente salvo:', clienteSalvo);

        limparFormulario();
        carregarClientes();

        alert(`Cliente ${estavaEditando ? 'atualizado' : 'cadastrado'} com sucesso!`);

    } catch (error) {
        console.error('Erro:', error);
        alert(error.message || 'Erro ao salvar cliente. Verifique o console para mais detalhes.');
    }
}

async function excluirCliente(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Erro ao excluir cliente');
        }

        carregarClientes();
        alert('Cliente excluído com sucesso!');

    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao excluir cliente. Verifique o console para mais detalhes.');
    }
}

async function buscarClientes() {
    const termo = searchInput.value.trim().toLowerCase();
    const termoCpf = soDigitos(termo);

    try {
        mostrarLoading(true);
        const response = await fetch(API_BASE_URL);

        if (!response.ok) {
            throw new Error('Erro ao buscar clientes');
        }

        const clientes = await response.json();
        const clientesFiltrados = clientes.filter(cliente =>
            cliente.nome.toLowerCase().includes(termo) ||
            cliente.email.toLowerCase().includes(termo) ||
            (termoCpf !== '' && cliente.cpf.includes(termoCpf))
        );

        exibirClientes(clientesFiltrados);

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        mostrarLoading(false);
    }
}

function exibirClientes(clientes) {
    if (clientes.length === 0) {
        clientesList.innerHTML = `
            <div class="empty-state">
                <h3>📭 Nenhum cliente encontrado</h3>
                <p>${searchInput.value ? 'Tente buscar com outros termos' : 'Cadastre o primeiro cliente usando o formulário acima'}</p>
            </div>
        `;
        return;
    }

    clientesList.innerHTML = clientes.map(cliente => `
        <div class="cliente-card" data-id="${cliente.id}">
            <div class="cliente-info">
                <h3>${escaparHtml(cliente.nome)}</h3>
                <p>✉️ ${escaparHtml(cliente.email)}</p>
                <p>📞 ${escaparHtml(formatarTelefone(cliente.telefone) || 'Não informado')}</p>
                <p>🪪 ${escaparHtml(formatarCpf(cliente.cpf))}</p>
                <small>ID: ${cliente.id}</small>
            </div>
            <div class="cliente-actions">
                <button class="btn-edit" onclick="editarCliente(${cliente.id})">✏️ Editar</button>
                <button class="btn-delete" onclick="solicitarExclusao(${cliente.id})">🗑️ Excluir</button>
            </div>
        </div>
    `).join('');
}

function editarCliente(id) {
    fetch(`${API_BASE_URL}/${id}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao carregar cliente');
            }
            return response.json();
        })
        .then(cliente => {
            document.getElementById('clienteId').value = cliente.id;
            document.getElementById('nome').value = cliente.nome;
            document.getElementById('email').value = cliente.email;
            campoTelefone.value = formatarTelefone(cliente.telefone);
            campoCpf.value = formatarCpf(cliente.cpf);

            formTitle.textContent = 'Editar Cliente';
            document.getElementById('btnSalvar').textContent = 'Atualizar Cliente';
            btnCancelar.style.display = 'inline-block';
            editando = true;

            document.querySelector('.form-section').scrollIntoView({
                behavior: 'smooth'
            });
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao carregar cliente para edição');
        });
}

function cancelarEdicao() {
    limparFormulario();
}

function limparFormulario() {
    clienteForm.reset();
    document.getElementById('clienteId').value = '';
    formTitle.textContent = 'Cadastrar Novo Cliente';
    document.getElementById('btnSalvar').textContent = 'Cadastrar Cliente';
    btnCancelar.style.display = 'none';
    editando = false;
}

function solicitarExclusao(id) {
    const card = document.querySelector(`.cliente-card[data-id="${id}"]`);
    const nome = card ? card.querySelector('h3').textContent : '';
    clienteParaExcluir = id;
    confirmMessage.textContent = `Tem certeza que deseja excluir o cliente "${nome}"?`;
    confirmModal.style.display = 'block';
}

function confirmarExclusao() {
    if (clienteParaExcluir) {
        excluirCliente(clienteParaExcluir);
        fecharModal();
    }
}

function fecharModal() {
    confirmModal.style.display = 'none';
    clienteParaExcluir = null;
}

function mostrarLoading(mostrar) {
    loading.style.display = mostrar ? 'block' : 'none';
}

let timeoutBusca;
searchInput.addEventListener('input', () => {
    clearTimeout(timeoutBusca);
    timeoutBusca = setTimeout(buscarClientes, 500);
});
