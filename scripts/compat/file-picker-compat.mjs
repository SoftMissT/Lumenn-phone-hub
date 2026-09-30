import { ERROR_CODES } from "../core/constants.mjs";
import { fail, LumennError } from "../core/errors.mjs";

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

  if (typeof Picker.pick === "function") {
    return Picker.pick(options);
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    try {
      const picker = new Picker({
        type: options.type ?? "any",
        current: options.current ?? "",
        request: options.current ?? "",
        callback: (path) => {
          settle(path);
          picker.close();
        },
      });
      picker.addEventListener?.("close", () => settle(null));
      picker.render(true);
    } catch {
      reject(
        new LumennError(
          ERROR_CODES.NOT_IMPLEMENTED,
          "FilePicker indisponível nesta versão do Foundry.",
        ),
      );
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

export function uploadFile({
  source = "data",
  path = "",
  file,
  notify = false,
} = {}) {
  const impl =
    globalThis.foundry?.applications?.apps?.FilePicker?.implementation ??
    getFilePickerClass();
  const target =
    typeof impl?.upload === "function" ? impl : getFilePickerClass();
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
  return target.upload(source, path, file, {}, { notify });
}
