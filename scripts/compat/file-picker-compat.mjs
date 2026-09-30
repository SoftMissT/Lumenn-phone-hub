import { ERROR_CODES } from "../core/constants.mjs";
import { fail, LumennError } from "../core/errors.mjs";
import { randomId } from "../validation/ids.mjs";

export function getFilePickerClass() {
  const f = globalThis.foundry ?? {};
  return (
    f.applications?.apps?.FilePicker?.implementation ??
    f.applications?.apps?.FilePicker ??
    globalThis.FilePicker ??
    null
  );
}

export function openFilePicker(options = {}) {
  const Picker = getFilePickerClass();
  if (!Picker) {
    return Promise.reject(
      new LumennError(
        ERROR_CODES.NOT_IMPLEMENTED,
        "FilePicker indisponível nesta versão do Foundry.",
      ),
    );
  }

  // Versões que expõem a fábrica estática: caminho mais simples.
  if (typeof Picker.pick === "function") {
    return Picker.pick(options);
  }

  // O FilePicker do Foundry (v13/v14) recusa abrir sem FILES_BROWSE e volta
  // sem renderizar, sem callback e sem evento de close — a Promise ficaria
  // pendente para sempre (o defeito original). Mesma checagem do core.
  if (globalThis.game?.user?.can?.("FILES_BROWSE") === false) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const failPicker = (error) => {
      if (settled) return;
      settled = true;
      reject(
        error instanceof LumennError
          ? error
          : new LumennError(
              ERROR_CODES.NOT_IMPLEMENTED,
              error?.message ||
                "Não foi possível abrir o seletor de arquivos.",
              { cause: error },
            ),
      );
    };

    let picker;
    try {
      picker = new Picker({
        type: options.type ?? "any",
        current: options.current ?? "",
        callback: (path) => {
          settle(path ?? null);
          picker?.close?.();
        },
      });
    } catch (error) {
      failPicker(error);
      return;
    }

    // Fechar sem escolher também precisa liquidar a Promise.
    try {
      picker.addEventListener?.("close", () => settle(null));
    } catch {
      // Emissores que não suportam o evento: segue sem o atalho de close.
    }

    // `browse()` é o caminho do próprio core no v13/v14: carrega o diretório
    // e força o primeiro render. Sem ele, o render antigo — sempre com um
    // objeto de opções, nunca booleano — tenta abrir mesmo assim.
    let opening;
    try {
      opening =
        typeof picker.browse === "function"
          ? picker.browse()
          : picker.render({ force: true });
    } catch (error) {
      failPicker(error);
      return;
    }
    // Falha de render/browse (socket, enquadramento, permissão) precisa
    // rejeitar a Promise em vez de deixá-la pendente para sempre.
    if (opening && typeof opening.catch === "function") {
      opening.catch((error) => failPicker(error));
    }
  });
}

export function canUploadFiles() {
  const user = globalThis.game?.user;
  if (typeof user?.can !== "function") return false;
  try {
    return user.can("FILES_UPLOAD") === true;
  } catch {
    return false;
  }
}

// Sem esta permissão o FilePicker do Foundry nem abre para o usuário - ele
// retorna cedo e em silêncio. Melhor saber antes de oferecer o botão.
export function canBrowseFiles() {
  const user = globalThis.game?.user;
  if (typeof user?.can !== "function") return false;
  try {
    return user.can("FILES_BROWSE") === true;
  } catch {
    return false;
  }
}

function pickerImpl() {
  return (
    globalThis.foundry?.applications?.apps?.FilePicker?.implementation ??
    getFilePickerClass()
  );
}

// Best-effort: o `FilePicker.upload` não cria a pasta de destino e falha com
// "Target directory <path> does not exist" se ela não existir. Criar aqui é um
// passo preparatório — se falhar por qualquer motivo (inclusive "já existe"),
// o upload segue e devolve o erro real. Não vale adivinhar a mensagem do
// Foundry para decidir se a falha foi "já existe".
export async function ensureDirectory({ source = "data", path = "" } = {}) {
  if (!path) return false;
  const target = pickerImpl();
  if (typeof target?.createDirectory !== "function") return false;
  try {
    await target.createDirectory(source, path);
    return true;
  } catch {
    return false;
  }
}

export async function uploadFile({
  source = "data",
  path = "",
  file,
  notify = false,
} = {}) {
  const target = pickerImpl();
  if (!target || typeof target.upload !== "function") {
    return Promise.reject(
      fail(
        ERROR_CODES.NOT_IMPLEMENTED,
        "Upload indisponível nesta versão do Foundry.",
      ),
    );
  }
  if (
    typeof globalThis.File !== "function" ||
    !(file instanceof globalThis.File)
  ) {
    return Promise.reject(
      fail(ERROR_CODES.INVALID_ARGUMENT, "Arquivo inválido para upload."),
    );
  }
  await ensureDirectory({ source, path });
  // O Foundry grava usando o nome do arquivo: dois uploads de "foto.jpg" se
  // sobrescrevem, e o segundo GM apagaria a imagem do primeiro sem aviso. O
  // prefixo aleatório torna cada caminho único; o nome legível continua ali.
  const unique = new globalThis.File([file], `${randomId(8)}-${file.name}`, {
    type: file.type,
  });
  return target.upload(source, path, unique, {}, { notify });
}
